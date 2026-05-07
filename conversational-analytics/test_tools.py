"""
Tests for the Conversational Analytics tool dispatcher.

Covers:
  1. Valid tool call → returns structured data
  2. Unknown tool name → returns error with available tools
  3. ERPNext timeout → returns generic error (sensitive info stays in logs)
  4. Empty result → returns success with empty data list
  5. Response formatter → table / info / error formats
"""

import pytest
from unittest.mock import patch, MagicMock

# We need to set up env vars BEFORE importing the modules under test
# so the ERPNextClient doesn't warn about missing credentials.
import os
os.environ.setdefault("ERPNEXT_URL", "http://test-erp:8080")
os.environ.setdefault("ERPNEXT_API_KEY", "test_key")
os.environ.setdefault("ERPNEXT_API_SECRET", "test_secret")

from tools import run_tool, _get_client, TOOL_REGISTRY
from erpnext_client import ERPNextClient, ERPNextClientError
from main import format_response


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_INVOICES = [
    {
        "name": "SINV-00001",
        "customer": "CUST-001",
        "customer_name": "Acme Corp",
        "posting_date": "2026-05-01",
        "grand_total": 15000.00,
        "status": "Unpaid",
        "due_date": "2026-05-31",
        "currency": "INR",
        "docstatus": 1,
    },
    {
        "name": "SINV-00002",
        "customer": "CUST-002",
        "customer_name": "Beta Industries",
        "posting_date": "2026-04-15",
        "grand_total": 28500.50,
        "status": "Paid",
        "due_date": "2026-05-15",
        "currency": "INR",
        "docstatus": 1,
    },
]

SAMPLE_SALES_ORDERS = [
    {
        "name": "SO-00001",
        "customer": "CUST-001",
        "customer_name": "Acme Corp",
        "transaction_date": "2026-04-20",
        "grand_total": 45000.00,
        "status": "To Bill",
        "docstatus": 1,
        "currency": "INR",
    },
]

SAMPLE_CUSTOMERS = [
    {
        "name": "CUST-001",
        "customer_name": "Acme Corp",
        "customer_group": "Commercial",
        "territory": "India",
    },
]


# ---------------------------------------------------------------------------
# 1. Valid tool call → success with data
# ---------------------------------------------------------------------------

class TestValidToolCalls:
    """run_tool with a valid tool name and mocked ERPNext data."""

    @patch("tools._get_client")
    def test_get_invoices_returns_data(self, mock_get_client):
        mock_client = MagicMock(spec=ERPNextClient)
        mock_client.get_list.return_value = SAMPLE_INVOICES
        mock_get_client.return_value = mock_client

        result = run_tool("get_invoices", {"limit": 10})

        assert result["success"] is True
        assert len(result["data"]) == 2
        assert result["data"][0]["name"] == "SINV-00001"
        assert result["data"][1]["status"] == "Paid"

        # Verify get_list was called with correct doctype & fields
        call_kwargs = mock_client.get_list.call_args
        assert call_kwargs.kwargs["doctype"] == "Sales Invoice"
        assert "name" in call_kwargs.kwargs["fields"]
        assert "grand_total" in call_kwargs.kwargs["fields"]

    @patch("tools._get_client")
    def test_get_sales_orders_returns_data(self, mock_get_client):
        mock_client = MagicMock(spec=ERPNextClient)
        mock_client.get_list.return_value = SAMPLE_SALES_ORDERS
        mock_get_client.return_value = mock_client

        result = run_tool("get_sales_orders", {"limit": 5})

        assert result["success"] is True
        assert len(result["data"]) == 1
        assert result["data"][0]["name"] == "SO-00001"

    @patch("tools._get_client")
    def test_get_customers_returns_data(self, mock_get_client):
        mock_client = MagicMock(spec=ERPNextClient)
        mock_client.get_list.return_value = SAMPLE_CUSTOMERS
        mock_get_client.return_value = mock_client

        result = run_tool("get_customers", {"limit": 10})

        assert result["success"] is True
        assert len(result["data"]) == 1
        assert result["data"][0]["customer_name"] == "Acme Corp"
        assert result["data"][0]["territory"] == "India"


# ---------------------------------------------------------------------------
# 2. Unknown tool name → error
# ---------------------------------------------------------------------------

class TestUnknownTool:
    """run_tool with a tool name that doesn't exist."""

    def test_unknown_tool_returns_error(self):
        result = run_tool("get_purchase_orders", {"limit": 5})

        assert result["success"] is False
        assert result["data"] is None
        assert "Unknown tool" in result["error"]
        assert "get_purchase_orders" in result["error"]

    def test_unknown_tool_lists_available(self):
        result = run_tool("nonexistent_tool")

        assert "get_invoices" in result["error"]
        assert "get_sales_orders" in result["error"]
        assert "get_customers" in result["error"]


# ---------------------------------------------------------------------------
# 3. ERPNext timeout → generic error
# ---------------------------------------------------------------------------

class TestERPNextTimeout:
    """run_tool when ERPNext times out."""

    @patch("tools._get_client")
    def test_timeout_returns_generic_error(self, mock_get_client):
        mock_client = MagicMock(spec=ERPNextClient)
        mock_client.get_list.side_effect = ERPNextClientError(
            "ERPNext request timed out after 5.0s", status_code=504
        )
        mock_get_client.return_value = mock_client

        result = run_tool("get_invoices", {"limit": 10})

        assert result["success"] is False
        assert result["data"] is None
        # User should NOT see raw timeout details
        assert "Failed to retrieve data" in result["error"]

    @patch("tools._get_client")
    def test_auth_failure_returns_generic_error(self, mock_get_client):
        mock_client = MagicMock(spec=ERPNextClient)
        mock_client.get_list.side_effect = ERPNextClientError(
            "ERPNext returned HTTP 401", status_code=401
        )
        mock_get_client.return_value = mock_client

        result = run_tool("get_invoices", {"limit": 10})

        assert result["success"] is False
        assert "Failed to retrieve data" in result["error"]
        # Should NOT leak the 401 status code to the user
        assert "401" not in result["error"]


# ---------------------------------------------------------------------------
# 4. Empty result
# ---------------------------------------------------------------------------

class TestEmptyResult:
    """run_tool when ERPNext returns no rows."""

    @patch("tools._get_client")
    def test_empty_list_returns_success(self, mock_get_client):
        mock_client = MagicMock(spec=ERPNextClient)
        mock_client.get_list.return_value = []
        mock_get_client.return_value = mock_client

        result = run_tool("get_invoices", {"limit": 10})

        assert result["success"] is True
        assert result["data"] == []


# ---------------------------------------------------------------------------
# 5. Row cap enforcement
# ---------------------------------------------------------------------------

class TestRowCap:
    """run_tool should cap results at 500 rows."""

    @patch("tools._get_client")
    def test_over_500_rows_is_capped(self, mock_get_client):
        mock_client = MagicMock(spec=ERPNextClient)
        mock_client.get_list.return_value = SAMPLE_INVOICES
        mock_get_client.return_value = mock_client

        result = run_tool("get_invoices", {"limit": 1000})

        # Verify get_list was called with capped limit
        call_kwargs = mock_client.get_list.call_args
        assert call_kwargs.kwargs["limit"] == 500

        assert result["success"] is True
        assert "note" in result
        assert "capped" in result["note"].lower()


# ---------------------------------------------------------------------------
# 6. Response formatter
# ---------------------------------------------------------------------------

class TestResponseFormatter:
    """Test the format_response function from main.py."""

    def test_table_format_from_list_data(self):
        tool_result = {"success": True, "data": SAMPLE_INVOICES}
        formatted = format_response(tool_result)

        assert formatted["type"] == "table"
        assert formatted["exportable"] is True
        assert "name" in formatted["columns"]
        assert "grand_total" in formatted["columns"]
        assert len(formatted["rows"]) == 2
        # First row, first column should be the invoice name
        name_idx = formatted["columns"].index("name")
        assert formatted["rows"][0][name_idx] == "SINV-00001"

    def test_info_format_from_empty_data(self):
        tool_result = {"success": True, "data": []}
        formatted = format_response(tool_result)

        assert formatted["type"] == "info"
        assert "No matching records" in formatted["message"]

    def test_info_format_from_none_data(self):
        tool_result = {"success": True, "data": None}
        formatted = format_response(tool_result)

        assert formatted["type"] == "info"
        assert "No matching records" in formatted["message"]

    def test_error_format_from_failure(self):
        tool_result = {
            "success": False,
            "data": None,
            "error": "Failed to retrieve data from ERP system. Check ERPNext connectivity and tenant credentials.",
        }
        formatted = format_response(tool_result)

        assert formatted["type"] == "error"
        assert "Failed to retrieve data" in formatted["message"]

    def test_table_includes_truncation_note(self):
        tool_result = {
            "success": True,
            "data": SAMPLE_INVOICES,
            "note": "Results capped at 500 rows.",
        }
        formatted = format_response(tool_result)

        assert formatted["type"] == "table"
        assert formatted["note"] == "Results capped at 500 rows."
