"""
Tool Dispatcher — Conversational Analytics
=============================================
Provides a registry of ERPNext data-fetching tools and a `run_tool()`
dispatcher that validates tool names and wraps ERPNext calls in
try/except with structured success/error responses.

Tool field selections are aligned with the fields used by the existing
Nexus ERP frontend actions:
  - app/actions/invoices.ts   → Sales Invoice (getInvoices)
  - app/actions/crm.ts        → Sales Order   (getSalesOrders / getSalesInvoices)
  - app/actions/crm.ts        → Customer      (getCustomers / convertOpportunityToCustomer)
"""

import logging
from typing import Any

from erpnext_client import ERPNextClient, ERPNextClientError

logger = logging.getLogger("conversational_analytics.tools")

# ---------------------------------------------------------------------------
# Row cap — prevent massive responses from overwhelming the LLM context
# ---------------------------------------------------------------------------

MAX_ROWS = 500

# ---------------------------------------------------------------------------
# Tool response type
# ---------------------------------------------------------------------------

ToolResult = dict[str, Any]  # {"success": bool, "data": Any, "error"?: str}

# ---------------------------------------------------------------------------
# Individual tools
# ---------------------------------------------------------------------------


def get_invoices(
    filters: list[list] | None = None,
    limit: int = 20,
    order_by: str = "posting_date desc",
    site_name: str | None = None,
    api_key: str | None = None,
    api_secret: str | None = None,
) -> ToolResult:
    """
    Fetch Sales Invoice list.
    """
    fields = [
        "name",
        "customer",
        "customer_name",
        "posting_date",
        "grand_total",
        "status",
        "due_date",
        "currency",
        "docstatus",
    ]
    return _fetch_doctype("Sales Invoice", fields, filters, limit, order_by, site_name, api_key, api_secret)


def get_sales_orders(
    filters: list[list] | None = None,
    limit: int = 20,
    order_by: str = "transaction_date desc",
    site_name: str | None = None,
    api_key: str | None = None,
    api_secret: str | None = None,
) -> ToolResult:
    """
    Fetch Sales Order list.
    """
    fields = [
        "name",
        "customer",
        "customer_name",
        "transaction_date",
        "grand_total",
        "status",
        "docstatus",
        "currency",
    ]
    return _fetch_doctype("Sales Order", fields, filters, limit, order_by, site_name, api_key, api_secret)


def get_customers(
    filters: list[list] | None = None,
    limit: int = 20,
    order_by: str = "name asc",
    site_name: str | None = None,
    api_key: str | None = None,
    api_secret: str | None = None,
) -> ToolResult:
    """
    Fetch Customer list.
    """
    fields = [
        "name",
        "customer_name",
        "customer_group",
        "territory",
    ]
    return _fetch_doctype("Customer", fields, filters, limit, order_by, site_name, api_key, api_secret)


# ---------------------------------------------------------------------------
# Shared fetch helper
# ---------------------------------------------------------------------------


def _fetch_doctype(
    doctype: str,
    fields: list[str],
    filters: list[list] | None,
    limit: int,
    order_by: str,
    site_name: str | None,
    api_key: str | None,
    api_secret: str | None,
) -> ToolResult:
    """
    Internal helper — wraps ERPNextClient.get_list with:
      - 500-row cap (notes truncation in response)
      - try/except for all ERPNext errors
      - Structured {success, data, error} response
    """
    capped = False
    effective_limit = limit
    if effective_limit > MAX_ROWS:
        effective_limit = MAX_ROWS
        capped = True

    try:
        client = ERPNextClient(api_key=api_key, api_secret=api_secret)
        data = client.get_list(
            doctype=doctype,
            fields=fields,
            filters=filters,
            limit=effective_limit,
            order_by=order_by,
            site_name=site_name,
        )
    except ERPNextClientError as exc:
        logger.error(f"Tool fetch failed for {doctype}: {exc}")
        # User sees a generic error — sensitive details stay in logs
        return {
            "success": False,
            "data": None,
            "error": "Failed to retrieve data from ERP system. Please try again later.",
        }
    except Exception as exc:
        logger.exception(f"Unexpected error fetching {doctype}: {exc}")
        return {
            "success": False,
            "data": None,
            "error": "An unexpected error occurred.",
        }

    result: ToolResult = {
        "success": True,
        "data": data,
    }

    if capped:
        result["note"] = (
            f"Results capped at {MAX_ROWS} rows. "
            f"Original request was for {limit} rows."
        )

    return result


# ---------------------------------------------------------------------------
# Tool registry & dispatcher
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict[str, callable] = {
    "get_invoices": get_invoices,
    "get_sales_orders": get_sales_orders,
    "get_customers": get_customers,
}


def run_tool(
    tool_name: str,
    params: dict[str, Any] | None = None,
    site_name: str | None = None,
    api_key: str | None = None,
    api_secret: str | None = None,
) -> ToolResult:
    """
    Dispatch a tool call by name.

    Validates the tool name against the registry before execution.
    Returns a structured response in all cases (never raises).

    Args:
        tool_name:  One of the registered tool names
        params:     Dict of keyword arguments for the tool function
        site_name:  ERPNext site name for multi-tenant routing (X-Frappe-Site-Name)
        api_key:    Per-request ERPNext API key (overrides env var)
        api_secret: Per-request ERPNext API secret (overrides env var)
    """
    if tool_name not in TOOL_REGISTRY:
        logger.warning(f"Unknown tool requested: {tool_name}")
        return {
            "success": False,
            "data": None,
            "error": f"Unknown tool: '{tool_name}'. "
                     f"Available tools: {', '.join(sorted(TOOL_REGISTRY.keys()))}",
        }

    tool_fn = TOOL_REGISTRY[tool_name]
    safe_params = dict(params or {})

    # Inject routing args — all tool functions accept these kwargs
    safe_params["site_name"] = site_name
    safe_params["api_key"] = api_key
    safe_params["api_secret"] = api_secret

    logger.info(f"Running tool: {tool_name} with params: {safe_params}")
    return tool_fn(**safe_params)
