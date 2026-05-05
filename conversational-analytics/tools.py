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
# Shared client instance (created once, reused across calls)
# ---------------------------------------------------------------------------

_client: ERPNextClient | None = None


def _get_client() -> ERPNextClient:
    global _client
    if _client is None:
        _client = ERPNextClient()
    return _client


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
) -> ToolResult:
    """
    Fetch Sales Invoice list.

    Fields match those used in:
      - app/actions/invoices.ts:getInvoices  → [name, customer_name, grand_total, status, due_date, currency, docstatus]
      - app/actions/crm.ts:getSalesInvoices  → [name, customer, customer_name, status, docstatus, posting_date, due_date, grand_total, currency, sales_order]

    We use the union of those field sets so the analytics layer has full
    context regardless of which view the user is asking about.
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
    return _fetch_doctype("Sales Invoice", fields, filters, limit, order_by, site_name)


def get_sales_orders(
    filters: list[list] | None = None,
    limit: int = 20,
    order_by: str = "transaction_date desc",
    site_name: str | None = None,
) -> ToolResult:
    """
    Fetch Sales Order list.

    Fields match those used in:
      - app/actions/crm.ts:getSalesOrders → [name, customer, customer_name, status, docstatus, transaction_date, delivery_date, grand_total, currency, quotation_no]
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
    return _fetch_doctype("Sales Order", fields, filters, limit, order_by, site_name)


def get_customers(
    filters: list[list] | None = None,
    limit: int = 20,
    order_by: str = "name asc",
    site_name: str | None = None,
) -> ToolResult:
    """
    Fetch Customer list.

    Fields match the Customer doctype structure used in:
      - app/actions/crm.ts:convertOpportunityToCustomer → customer_name, customer_type, territory
      - provisioning-service/app.py:DOC_PERM_MINIMUM → Customer as link target
    """
    fields = [
        "name",
        "customer_name",
        "customer_group",
        "territory",
    ]
    return _fetch_doctype("Customer", fields, filters, limit, order_by, site_name)


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
        client = _get_client()
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


def run_tool(tool_name: str, params: dict[str, Any] | None = None) -> ToolResult:
    """
    Dispatch a tool call by name.

    Validates the tool name against the registry before execution.
    Returns a structured response in all cases (never raises).

    Args:
        tool_name: One of the registered tool names
        params:    Dict of keyword arguments for the tool function
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
    safe_params = params or {}

    logger.info(f"Running tool: {tool_name} with params: {safe_params}")
    return tool_fn(**safe_params)
