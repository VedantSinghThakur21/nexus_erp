"""
Tests for the LLM intent parser layer.

Covers:
  1. extract_json — raw JSON, markdown-fenced JSON, nested braces
  2. fallback_intent — keyword matching for all tool types + unknown
  3. get_tool_call — mocked OpenRouter responses (success, retry, failure)
  4. Parameter normalization in main.py
  5. /api/chat endpoint — unknown tool returns suggestions
"""

import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import os
os.environ.setdefault("ERPNEXT_URL", "http://test-erp:8080")
os.environ.setdefault("ERPNEXT_API_KEY", "test_key")
os.environ.setdefault("ERPNEXT_API_SECRET", "test_secret")
os.environ.setdefault("OPENROUTER_API_KEY", "test_openrouter_key")
os.environ.setdefault("SITE_URL", "https://test-nexus.com")

from llm import extract_json, fallback_intent, get_tool_call
from main import _normalize_tool_params, ALLOWED_TOOLS, EXAMPLE_QUERIES


# ===========================================================================
# 1. extract_json — JSON extraction from LLM responses
# ===========================================================================


class TestExtractJSON:
    """Test extract_json() with various LLM output formats."""

    def test_raw_json(self):
        """Clean JSON string — most common case."""
        text = '{"tool": "get_invoices", "parameters": {"limit": 50}}'
        result = extract_json(text)
        assert result["tool"] == "get_invoices"
        assert result["parameters"]["limit"] == 50

    def test_json_with_whitespace(self):
        """JSON with leading/trailing whitespace and newlines."""
        text = '\n  {"tool": "get_customers", "parameters": {"search": "acme"}}  \n'
        result = extract_json(text)
        assert result["tool"] == "get_customers"

    def test_markdown_fenced_json(self):
        """JSON wrapped in ```json ... ``` fences."""
        text = '```json\n{"tool": "get_sales_orders", "parameters": {}}\n```'
        result = extract_json(text)
        assert result["tool"] == "get_sales_orders"

    def test_markdown_fenced_no_language(self):
        """JSON wrapped in ``` ... ``` (no language tag)."""
        text = '```\n{"tool": "get_invoices", "parameters": {"limit": 10}}\n```'
        result = extract_json(text)
        assert result["tool"] == "get_invoices"

    def test_json_with_surrounding_text(self):
        """JSON embedded in natural language text."""
        text = 'Here is the result:\n{"tool": "get_invoices", "parameters": {}}\nDone!'
        result = extract_json(text)
        assert result["tool"] == "get_invoices"

    def test_nested_braces(self):
        """JSON with nested objects (parameters with filters)."""
        text = '{"tool": "get_invoices", "parameters": {"filters": [["status", "=", "Unpaid"]]}}'
        result = extract_json(text)
        assert result["tool"] == "get_invoices"
        assert result["parameters"]["filters"] == [["status", "=", "Unpaid"]]

    def test_invalid_json_raises(self):
        """Completely unparseable text raises ValueError."""
        with pytest.raises(ValueError):
            extract_json("This is not JSON at all, just plain text.")

    def test_empty_string_raises(self):
        """Empty string raises ValueError."""
        with pytest.raises(ValueError):
            extract_json("")


# ===========================================================================
# 2. fallback_intent — keyword-based intent parser
# ===========================================================================


class TestFallbackIntent:
    """Test fallback_intent() keyword matching."""

    def test_invoice_keywords(self):
        assert fallback_intent("Show unpaid invoices")["tool"] == "get_invoices"
        assert fallback_intent("my bills")["tool"] == "get_invoices"
        assert fallback_intent("Billed this month")["tool"] == "get_invoices"

    def test_sales_order_keywords(self):
        assert fallback_intent("sales orders")["tool"] == "get_sales_orders"
        assert fallback_intent("show me orders")["tool"] == "get_sales_orders"
        assert fallback_intent("SALES ORDER list")["tool"] == "get_sales_orders"

    def test_customer_keywords(self):
        assert fallback_intent("find customer acme")["tool"] == "get_customers"
        assert fallback_intent("list all clients")["tool"] == "get_customers"
        assert fallback_intent("buyer information")["tool"] == "get_customers"

    def test_unknown_query(self):
        result = fallback_intent("What is the weather today")
        assert result["tool"] == "unknown"
        assert result["parameters"] == {}

    def test_empty_query(self):
        result = fallback_intent("")
        assert result["tool"] == "unknown"


# ===========================================================================
# 3. get_tool_call — mocked LLM calls
# ===========================================================================


class TestGetToolCall:
    """Test get_tool_call() with mocked OpenRouter responses."""

    @pytest.mark.asyncio
    @patch("llm._call_openrouter")
    async def test_successful_llm_call(self, mock_call):
        """LLM returns clean JSON → parsed correctly."""
        mock_call.return_value = '{"tool": "get_invoices", "parameters": {"filters": [["status", "=", "Unpaid"]], "limit": 50}}'

        result = await get_tool_call("Show unpaid invoices")

        assert result["tool"] == "get_invoices"
        assert result["parameters"]["filters"] == [["status", "=", "Unpaid"]]
        # Should only call LLM once (no retry needed)
        assert mock_call.call_count == 1

    @pytest.mark.asyncio
    @patch("llm._call_openrouter")
    async def test_markdown_wrapped_response(self, mock_call):
        """LLM returns JSON wrapped in markdown — should still parse."""
        mock_call.return_value = '```json\n{"tool": "get_customers", "parameters": {"search": "acme"}}\n```'

        result = await get_tool_call("Find customer acme")

        assert result["tool"] == "get_customers"
        assert result["parameters"]["search"] == "acme"

    @pytest.mark.asyncio
    @patch("llm._call_openrouter")
    async def test_retry_on_json_failure(self, mock_call):
        """First attempt returns garbage → retry with stricter prompt → success."""
        mock_call.side_effect = [
            "I think you want invoices. Let me help...",  # Bad first response
            '{"tool": "get_invoices", "parameters": {}}',  # Good retry
        ]

        result = await get_tool_call("Show invoices")

        assert result["tool"] == "get_invoices"
        assert mock_call.call_count == 2

        # Verify the retry message was prefixed
        second_call_args = mock_call.call_args_list[1]
        assert "Respond with only a JSON object" in second_call_args[0][1]

    @pytest.mark.asyncio
    @patch("llm._call_openrouter")
    async def test_both_attempts_fail_raises(self, mock_call):
        """Both attempts return garbage → should raise ValueError."""
        mock_call.side_effect = [
            "I cannot help with that.",
            "Still can't help!",
        ]

        with pytest.raises(ValueError):
            await get_tool_call("nonsense query")

    @pytest.mark.asyncio
    @patch("llm._call_openrouter")
    async def test_llm_http_error_raises(self, mock_call):
        """OpenRouter HTTP error → should propagate."""
        import httpx
        mock_call.side_effect = httpx.HTTPStatusError(
            "429 Too Many Requests",
            request=MagicMock(),
            response=MagicMock(status_code=429),
        )

        with pytest.raises(httpx.HTTPStatusError):
            await get_tool_call("Show invoices")

    @pytest.mark.asyncio
    async def test_missing_api_key_raises(self):
        """No OPENROUTER_API_KEY → RuntimeError."""
        with patch("llm.OPENROUTER_API_KEY", ""):
            with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY not set"):
                await get_tool_call("Show invoices")

    @pytest.mark.asyncio
    @patch("llm._call_openrouter")
    async def test_unknown_query_returns_unknown(self, mock_call):
        """LLM correctly identifies unsupported query."""
        mock_call.return_value = '{"tool": "unknown", "parameters": {}}'

        result = await get_tool_call("What is the weather today")

        assert result["tool"] == "unknown"
        assert result["parameters"] == {}


# ===========================================================================
# 4. Parameter normalization
# ===========================================================================


class TestParameterNormalization:
    """Test _normalize_tool_params() from main.py."""

    def test_passthrough_filters(self):
        params = _normalize_tool_params(
            "get_invoices",
            {"filters": [["status", "=", "Unpaid"]], "limit": 50}
        )
        assert params["filters"] == [["status", "=", "Unpaid"]]
        assert params["limit"] == 50

    def test_customer_search_to_filter(self):
        """'search' param on get_customers → customer_name LIKE filter."""
        params = _normalize_tool_params(
            "get_customers",
            {"search": "acme"}
        )
        assert params["filters"] == [["customer_name", "like", "%acme%"]]

    def test_customer_search_merged_with_filters(self):
        """'search' param merges with existing filters."""
        params = _normalize_tool_params(
            "get_customers",
            {
                "search": "beta",
                "filters": [["territory", "=", "India"]],
            }
        )
        assert len(params["filters"]) == 2
        assert ["territory", "=", "India"] in params["filters"]
        assert ["customer_name", "like", "%beta%"] in params["filters"]

    def test_invalid_limit_ignored(self):
        """Non-numeric limit is silently ignored."""
        params = _normalize_tool_params("get_invoices", {"limit": "abc"})
        assert "limit" not in params

    def test_order_by_passthrough(self):
        params = _normalize_tool_params(
            "get_invoices",
            {"order_by": "grand_total desc"}
        )
        assert params["order_by"] == "grand_total desc"

    def test_empty_params(self):
        params = _normalize_tool_params("get_invoices", {})
        assert params == {}


# ===========================================================================
# 5. Tool validation — allowed set
# ===========================================================================


class TestToolValidation:
    """Verify ALLOWED_TOOLS matches the tool registry."""

    def test_allowed_tools_contains_all_tools(self):
        assert "get_invoices" in ALLOWED_TOOLS
        assert "get_sales_orders" in ALLOWED_TOOLS
        assert "get_customers" in ALLOWED_TOOLS

    def test_unknown_not_in_allowed(self):
        assert "unknown" not in ALLOWED_TOOLS

    def test_example_queries_provided(self):
        assert len(EXAMPLE_QUERIES) == 3
        # Verify they mention real concepts users would ask about
        combined = " ".join(EXAMPLE_QUERIES).lower()
        assert "invoice" in combined
        assert "order" in combined or "sales" in combined
        assert "customer" in combined


# ===========================================================================
# 6. End-to-end query expectations (for manual LLM testing)
# ===========================================================================


class TestExpectedToolCalls:
    """
    These tests document the expected tool + filter mappings for the 5
    required test queries. They test fallback_intent() which should
    at minimum route to the correct tool.

    Full filter accuracy depends on the LLM and should be validated
    manually with a live OpenRouter key.
    """

    def test_show_unpaid_invoices(self):
        """Query 1: 'Show unpaid invoices' → get_invoices"""
        result = fallback_intent("Show unpaid invoices")
        assert result["tool"] == "get_invoices"

    def test_confirmed_sales_orders(self):
        """Query 2: 'Confirmed sales orders this month' → get_sales_orders"""
        result = fallback_intent("Confirmed sales orders this month")
        assert result["tool"] == "get_sales_orders"

    def test_find_customer_acme(self):
        """Query 3: 'Find customer acme' → get_customers"""
        result = fallback_intent("Find customer acme")
        assert result["tool"] == "get_customers"

    def test_invoices_overdue(self):
        """Query 4: 'Invoices overdue by more than 30 days' → get_invoices"""
        result = fallback_intent("Invoices overdue by more than 30 days")
        assert result["tool"] == "get_invoices"

    def test_weather_unknown(self):
        """Query 5: 'What is the weather today' → unknown"""
        result = fallback_intent("What is the weather today")
        assert result["tool"] == "unknown"
