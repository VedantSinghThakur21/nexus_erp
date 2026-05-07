"""
Local analytics engine (no LLM required).

This module computes deterministic "insights" from ERPNext rows so the feature
still feels useful when OpenRouter is rate-limited (429) and we fall back to
keyword routing.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from statistics import mean, pstdev
from typing import Any, Iterable


def _to_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        return float(str(value).replace(",", "").strip())
    except Exception:
        return None


def _to_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    s = str(value).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None


def _safe_mean(nums: list[float]) -> float | None:
    if not nums:
        return None
    return mean(nums)


def _safe_std(nums: list[float]) -> float | None:
    if len(nums) < 2:
        return None
    return pstdev(nums)


def analyse_invoices(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    """
    Compute invoice insights.

    Expects ERPNext Sales Invoice fields (best-effort):
      - status, due_date, posting_date
      - outstanding_amount (preferred) or grand_total
      - customer / customer_name
      - name
    """
    if not rows:
        return None

    amounts: list[float] = []
    outstanding: list[float] = []
    overdue_days: list[int] = []

    bucket_counts = {"0-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
    debtor_totals: dict[str, float] = {}
    anomalies: list[dict[str, Any]] = []

    today = date.today()
    for r in rows:
        amt = _to_float(r.get("outstanding_amount"))
        if amt is None:
            amt = _to_float(r.get("grand_total"))
        if amt is not None:
            amounts.append(amt)
            if str(r.get("status", "")).lower() in ("unpaid", "overdue", "partly paid"):
                outstanding.append(amt)

        # aging buckets for unpaid-ish invoices (best-effort)
        status = str(r.get("status", "")).lower()
        if status in ("unpaid", "overdue", "partly paid"):
            dd = _to_date(r.get("due_date")) or _to_date(r.get("posting_date"))
            if dd:
                days = (today - dd).days
                if days > 0:
                    overdue_days.append(days)
                    if days <= 30:
                        bucket_counts["0-30"] += 1
                    elif days <= 60:
                        bucket_counts["31-60"] += 1
                    elif days <= 90:
                        bucket_counts["61-90"] += 1
                    else:
                        bucket_counts["90+"] += 1

            debtor = (r.get("customer_name") or r.get("customer") or "Unknown").strip()
            if debtor:
                debtor_totals[debtor] = debtor_totals.get(debtor, 0.0) + (amt or 0.0)

    avg = _safe_mean(amounts)
    std = _safe_std(amounts)
    if avg is not None and std is not None and std > 0:
        for r in rows:
            a = _to_float(r.get("outstanding_amount")) or _to_float(r.get("grand_total"))
            if a is None:
                continue
            z = (a - avg) / std
            if z >= 2.5:
                anomalies.append(
                    {
                        "name": r.get("name"),
                        "customer": r.get("customer_name") or r.get("customer"),
                        "amount": a,
                        "z_score": round(z, 2),
                    }
                )

    top_debtors = sorted(
        [{"customer": k, "amount": round(v, 2)} for k, v in debtor_totals.items()],
        key=lambda x: x["amount"],
        reverse=True,
    )[:3]

    insight: dict[str, Any] = {
        "kind": "invoices",
        "total_count": len(rows),
        "total_amount": round(sum(amounts), 2) if amounts else None,
        "unpaid_count": sum(
            1 for r in rows if str(r.get("status", "")).lower() in ("unpaid", "overdue", "partly paid")
        ),
        "unpaid_amount": round(sum(outstanding), 2) if outstanding else None,
        "overdue_count": len(overdue_days),
        "aging_buckets": bucket_counts,
        "top_debtors": top_debtors,
        "anomalies": anomalies[:5],
    }
    return insight


def analyse_sales_orders(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not rows:
        return None

    amounts: list[float] = []
    status_counts: dict[str, int] = {}
    docstatus_counts: dict[str, int] = {}

    for r in rows:
        amt = _to_float(r.get("grand_total"))
        if amt is not None:
            amounts.append(amt)
        status = str(r.get("status") or "").strip() or "Unknown"
        status_counts[status] = status_counts.get(status, 0) + 1
        docstatus = str(r.get("docstatus") if r.get("docstatus") is not None else "Unknown")
        docstatus_counts[docstatus] = docstatus_counts.get(docstatus, 0) + 1

    return {
        "kind": "sales_orders",
        "total_count": len(rows),
        "total_amount": round(sum(amounts), 2) if amounts else None,
        "status_breakdown": status_counts,
        "docstatus_breakdown": docstatus_counts,
    }


def analyse_customers(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not rows:
        return None
    return {
        "kind": "customers",
        "total_count": len(rows),
        "customer_groups": _top_counts((r.get("customer_group") for r in rows), 5),
        "territories": _top_counts((r.get("territory") for r in rows), 5),
    }


def _top_counts(values: Iterable[Any], limit: int) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for v in values:
        s = str(v).strip() if v is not None else ""
        if not s:
            continue
        counts[s] = counts.get(s, 0) + 1
    return [
        {"name": k, "count": v}
        for k, v in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    ]

