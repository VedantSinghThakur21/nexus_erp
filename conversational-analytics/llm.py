"""
LLM Intent Parser — Conversational Analytics
================================================
Translates natural language queries into structured tool calls using
OpenRouter (free tier, Llama 3.3 70B Instruct).

Pipeline:
  1. get_tool_call(query)  → calls LLM → parses JSON
  2. On JSON parse failure  → retries ONCE with stricter prompt
  3. On second failure      → falls through to fallback_intent()

Fallback:
  fallback_intent(query)  → pure regex/keyword, no LLM

Logging:
  Every LLM call (query, model, tool chosen, latency ms) is logged
  to logs/llm_calls.log via a dedicated file logger.
"""

import json
import logging
import os
import re
import time
from datetime import date
from pathlib import Path
from typing import Any

import httpx

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
SITE_URL = os.environ.get("SITE_URL", "https://nexus-erp.com")
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

LLM_TIMEOUT = 15.0  # seconds — generous for free tier latency

# ---------------------------------------------------------------------------
# Logging — dual logger: main + dedicated file for LLM calls
# ---------------------------------------------------------------------------

logger = logging.getLogger("conversational_analytics.llm")

# Dedicated file logger for LLM call tracing
_llm_file_logger: logging.Logger | None = None


def _get_llm_file_logger() -> logging.Logger:
    """
    Lazily create a file logger that writes to logs/llm_calls.log.
    Separate from the main application logger so LLM traces don't
    pollute stdout in production.
    """
    global _llm_file_logger
    if _llm_file_logger is not None:
        return _llm_file_logger

    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    file_logger = logging.getLogger("llm_calls")
    file_logger.setLevel(logging.INFO)
    file_logger.propagate = False  # Don't bubble up to root

    handler = logging.FileHandler(log_dir / "llm_calls.log", encoding="utf-8")
    handler.setFormatter(
        logging.Formatter("%(asctime)s | %(message)s")
    )
    file_logger.addHandler(handler)

    _llm_file_logger = file_logger
    return file_logger


# ---------------------------------------------------------------------------
# System prompt — injected with today's date at runtime
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_TEMPLATE = """You are a strict ERP data assistant. Translate natural language into tool calls.

Available tools:
1. get_invoices — filters, limit (default 50), order_by (default "posting_date desc")
2. get_sales_orders — filters, limit (default 20)
3. get_customers — search (substring on customer_name), limit (default 10)

Filters use ERPNext format: [["field","operator","value"]]

Rules:
- Output ONLY a raw JSON object. No markdown, no backticks, no explanation.
- Exactly two keys: "tool" (string) and "parameters" (object).
- Dates must be ISO format (YYYY-MM-DD). Today is {today}.
- Unknown/unsupported queries: {{"tool":"unknown","parameters":{{}}}}"""


def _build_system_prompt() -> str:
    """Inject today's date into the system prompt."""
    return SYSTEM_PROMPT_TEMPLATE.format(today=date.today().isoformat())


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------


def extract_json(text: str) -> dict[str, Any]:
    """
    Extract a JSON object from LLM response text.

    Free-tier models sometimes wrap JSON in markdown fences like:
        ```json
        {"tool": "get_invoices", "parameters": {}}
        ```
    This function handles that gracefully.

    Strategy:
      1. Strip markdown code fences (```json ... ``` or ``` ... ```)
      2. Try json.loads() on the cleaned string
      3. If that fails, regex-find the first {...} block and parse it
      4. If still fails, raise ValueError
    """
    cleaned = text.strip()

    # Step 1: Strip markdown fences
    # Handles ```json\n...\n``` and ```\n...\n```
    fence_pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    fence_match = re.search(fence_pattern, cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    # Step 2: Try direct parse
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Step 3: Regex — find the first {...} block (handles nested braces)
    brace_match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", cleaned, re.DOTALL)
    if brace_match:
        try:
            parsed = json.loads(brace_match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from LLM response: {text[:200]}")


# ---------------------------------------------------------------------------
# Fallback intent parser — pure regex/keyword, no LLM
# ---------------------------------------------------------------------------


def fallback_intent(query: str) -> dict[str, Any]:
    """
    Regex/keyword-based intent parser.
    Used when the LLM is unavailable or returns unparseable output.

    Returns the same {tool, parameters} structure as the LLM.
    """
    q = query.lower().strip()
    if not q:
        return {"tool": "unknown", "parameters": {}}

    # ------------------------------------------------------------------
    # Invoices
    # ------------------------------------------------------------------
    if any(kw in q for kw in ["invoice", "invoices", "bill", "bills", "billed", "invoiced"]):
        params: dict[str, Any] = {}

        # Status filters (ERPNext Sales Invoice.status)
        if any(kw in q for kw in ["unpaid", "outstanding", "due", "not paid"]):
            params["filters"] = [["status", "=", "Unpaid"]]
        elif "paid" in q:
            params["filters"] = [["status", "=", "Paid"]]

        # Overdue heuristics (best-effort; depends on ERPNext schema/config)
        # We keep this conservative to avoid false negatives.
        if "overdue" in q and "filters" not in params:
            params["filters"] = [["status", "=", "Unpaid"]]

        return {"tool": "get_invoices", "parameters": params}

    # ------------------------------------------------------------------
    # Sales Orders
    # ------------------------------------------------------------------
    if re.search(r"\b(sales?\s*order|orders?)\b", q):
        params: dict[str, Any] = {}
        # Common "confirmed" intent → docstatus=1 (Submitted)
        if "confirmed" in q or "submitted" in q:
            params["filters"] = [["docstatus", "=", 1]]
        return {"tool": "get_sales_orders", "parameters": params}

    # ------------------------------------------------------------------
    # Customers
    # ------------------------------------------------------------------
    if any(kw in q for kw in ["customer", "customers", "client", "clients", "buyer"]):
        # Extract a naive "search" term if present: "find customer acme"
        m = re.search(r"\b(?:find|search)\s+(?:customer|client)\s+(.+)$", q)
        params: dict[str, Any] = {}
        if m and m.group(1):
            params["search"] = m.group(1).strip().strip('"').strip("'")
        return {"tool": "get_customers", "parameters": params}

    return {"tool": "unknown", "parameters": {}}


# ---------------------------------------------------------------------------
# LLM call — OpenRouter
# ---------------------------------------------------------------------------


async def _call_openrouter(system_prompt: str, user_message: str) -> str:
    """
    POST to OpenRouter chat completions API.
    Returns the raw content string from the first choice.
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": SITE_URL,
        "X-Title": "Nexus ERP Analytics",
        "Content-Type": "application/json",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "temperature": 0.0,
        "max_tokens": 200,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        response = await client.post(
            OPENROUTER_URL,
            headers=headers,
            json=payload,
        )
        response.raise_for_status()

    data = response.json()

    # OpenRouter returns: {"choices": [{"message": {"content": "..."}}]}
    choices = data.get("choices", [])
    if not choices:
        raise ValueError(f"OpenRouter returned no choices: {data}")

    content = choices[0].get("message", {}).get("content", "")
    if not content:
        raise ValueError(f"OpenRouter returned empty content: {data}")

    return content


# ---------------------------------------------------------------------------
# Main entry point — get_tool_call()
# ---------------------------------------------------------------------------


async def get_tool_call(query: str) -> dict[str, Any]:
    """
    Translate a natural language query into a tool call dict.

    Returns: {"tool": str, "parameters": dict}

    Pipeline:
      1. Call LLM with system prompt
      2. Extract JSON from response
      3. On JSON failure → retry ONCE with stricter prefix
      4. On second failure → raise (caller falls back to fallback_intent)
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not set — falling back to keyword parser")

    system_prompt = _build_system_prompt()
    file_logger = _get_llm_file_logger()

    start_ms = time.monotonic()

    # --- Attempt 1 ---
    try:
        raw_response = await _call_openrouter(system_prompt, query)
        latency_ms = int((time.monotonic() - start_ms) * 1000)

        try:
            result = extract_json(raw_response)
            file_logger.info(
                f"query={query!r} | model={OPENROUTER_MODEL} | "
                f"tool={result.get('tool')} | latency_ms={latency_ms} | attempt=1"
            )
            return result
        except ValueError:
            logger.warning(
                f"JSON extraction failed on attempt 1, retrying. "
                f"Raw response: {raw_response[:200]}"
            )
    except Exception as exc:
        latency_ms = int((time.monotonic() - start_ms) * 1000)
        logger.error(f"LLM call failed on attempt 1: {exc}")
        file_logger.info(
            f"query={query!r} | model={OPENROUTER_MODEL} | "
            f"tool=ERROR | latency_ms={latency_ms} | attempt=1 | error={exc}"
        )
        raise

    # --- Attempt 2 (retry with stricter prompt) ---
    start_ms = time.monotonic()
    stricter_query = f"Respond with only a JSON object, no other text: {query}"

    try:
        raw_response = await _call_openrouter(system_prompt, stricter_query)
        latency_ms = int((time.monotonic() - start_ms) * 1000)

        result = extract_json(raw_response)  # Let ValueError propagate
        file_logger.info(
            f"query={query!r} | model={OPENROUTER_MODEL} | "
            f"tool={result.get('tool')} | latency_ms={latency_ms} | attempt=2"
        )
        return result
    except Exception as exc:
        latency_ms = int((time.monotonic() - start_ms) * 1000)
        file_logger.info(
            f"query={query!r} | model={OPENROUTER_MODEL} | "
            f"tool=FALLBACK | latency_ms={latency_ms} | attempt=2 | error={exc}"
        )
        raise
