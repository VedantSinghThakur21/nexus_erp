"""
Nexus ERP — Conversational Analytics Service
===============================================
A FastAPI microservice that provides a conversational interface to
ERPNext data. Deployed alongside the existing provisioning service.

ARCHITECTURE:
- POST /api/chat → LLM-driven tool dispatch (fallback to keyword parser)
- GET  /health   → liveness check

PIPELINE:
  1. User query → LLM intent parser (OpenRouter / Llama 3.3 70B)
  2. LLM returns → {"tool": str, "parameters": dict}
  3. Validate tool name against allowed set
  4. Execute via run_tool()
  5. Format response → table / info / error

RESPONSE FORMATTING:
- list result  → {"type":"table","columns":[...],"rows":[...],"exportable":true}
- empty result → {"type":"info","message":"No matching records found."}
- error        → {"type":"error","message":"..."}
"""

import os
import logging
from datetime import datetime
from typing import Any, Optional

# Load .env file BEFORE importing modules that read os.environ
from dotenv import load_dotenv
load_dotenv()


from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from tools import run_tool, TOOL_REGISTRY
from llm import get_tool_call, fallback_intent

# ============================================================================
# Configuration
# ============================================================================

IS_PRODUCTION = os.environ.get("ENVIRONMENT", "production") == "production"

# Allowed tool names — validated before execution
ALLOWED_TOOLS = set(TOOL_REGISTRY.keys())

# Example queries shown when the user asks something unsupported
EXAMPLE_QUERIES = [
    "Show me all unpaid invoices",
    "List confirmed sales orders this month",
    "Find customer Acme",
]

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("conversational_analytics")

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Nexus ERP Conversational Analytics",
    version="2.0.0",
    docs_url="/docs" if not IS_PRODUCTION else None,
)

# CORS — required because the Next.js frontend (port 3000) calls this
# service (port 8003) from the browser. Without this, all requests fail.
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.avariq.in",   # production subdomains
    ],
    allow_origin_regex=r"https?://.*\.localhost(:\d+)?",  # dev subdomains
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ============================================================================
# Models
# ============================================================================


class ChatRequest(BaseModel):
    query: str
    tenant: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str


# ============================================================================
# Response Formatter
# ============================================================================


def format_response(tool_result: dict[str, Any]) -> dict[str, Any]:
    """
    Transform raw tool results into structured chat responses.

    Rules (from spec):
      - list result  → table format with columns, rows, exportable flag
      - empty result → info message
      - error        → error message
    """
    # Error case
    if not tool_result.get("success"):
        error_msg = tool_result.get("error", "An unexpected error occurred.")
        return {
            "type": "error",
            "message": error_msg,
        }

    data = tool_result.get("data")

    # Empty / None case
    if not data:
        return {
            "type": "info",
            "message": "No matching records found.",
        }

    # List / table case
    if isinstance(data, list):
        if len(data) == 0:
            return {
                "type": "info",
                "message": "No matching records found.",
            }

        # Extract columns from first row keys
        columns = list(data[0].keys())

        # Build rows as list-of-lists (positional, matching columns order)
        rows = [[row.get(col) for col in columns] for row in data]

        result: dict[str, Any] = {
            "type": "table",
            "columns": columns,
            "rows": rows,
            "exportable": True,
        }

        # Include truncation note if present
        if "note" in tool_result:
            result["note"] = tool_result["note"]

        return result

    # Fallback — unknown data shape
    return {
        "type": "error",
        "message": "Received an unexpected response format from the data layer.",
    }


# ============================================================================
# Parameter normalization
# ============================================================================


def _normalize_tool_params(tool_name: str, params: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize LLM-generated parameters into the format expected by run_tool().

    The LLM uses "parameters" with field names matching the system prompt.
    The tool functions expect specific keyword arguments. This bridge handles:
      - get_customers: "search" → convert to ERPNext filter on customer_name
      - Passthrough for filters, limit, order_by
    """
    normalized: dict[str, Any] = {}

    # Filters — pass through as-is (LLM generates ERPNext format)
    if "filters" in params:
        normalized["filters"] = params["filters"]

    # Limit
    if "limit" in params:
        try:
            normalized["limit"] = int(params["limit"])
        except (ValueError, TypeError):
            pass

    # Order by
    if "order_by" in params:
        normalized["order_by"] = str(params["order_by"])

    # Special case: get_customers "search" → customer_name filter
    if tool_name == "get_customers" and "search" in params:
        search_term = str(params["search"])
        # Build ERPNext "like" filter: [["customer_name", "like", "%term%"]]
        search_filter = [["customer_name", "like", f"%{search_term}%"]]
        # Merge with any existing filters
        existing = normalized.get("filters", [])
        normalized["filters"] = existing + search_filter

    return normalized


# ============================================================================
# API Endpoints
# ============================================================================


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Liveness check — confirms the service is up."""
    return HealthResponse(
        status="healthy",
        service="conversational-analytics",
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint — accepts a natural language query and tenant identifier.

    Pipeline:
      1. Try LLM intent parser (OpenRouter / Llama 3.3 70B)
      2. On any LLM failure → fall back to keyword-based parser
      3. Validate tool name against allowed set
      4. If tool == "unknown" → return friendly error with example queries
      5. Execute tool via run_tool()
      6. Format and return the result
    """
    logger.info(f"Chat request: tenant={request.tenant}, query={request.query}")

    # --- Step 1: Resolve intent (LLM → fallback) ---
    intent_source = "llm"
    try:
        tool_call = await get_tool_call(request.query)
    except Exception as exc:
        logger.warning(f"LLM intent parser failed, using fallback: {exc}")
        tool_call = fallback_intent(request.query)
        intent_source = "fallback"

    tool_name = tool_call.get("tool", "unknown")
    raw_params = tool_call.get("parameters", {})

    logger.info(
        f"Intent resolved: tool={tool_name}, params={raw_params}, "
        f"source={intent_source}"
    )

    # --- Step 2: Handle unknown/unsupported queries ---
    if tool_name == "unknown" or tool_name not in ALLOWED_TOOLS:
        return {
            "query": request.query,
            "tenant": request.tenant,
            "tool_used": None,
            "intent_source": intent_source,
            "response": {
                "type": "error",
                "message": (
                    "I can only help with ERP data queries. "
                    "Here are some things you can ask:"
                ),
                "suggestions": EXAMPLE_QUERIES,
            },
        }

    # --- Step 3: Normalize parameters ---
    params = _normalize_tool_params(tool_name, raw_params)

    # Add tenant site_name for multi-tenant routing
    # This matches the X-Frappe-Site-Name pattern from lib/api-client.ts
    root_domain = os.environ.get("ROOT_DOMAIN", "avariq.in")
    is_prod = os.environ.get("ENVIRONMENT", "production") == "production"
    site_name = (
        f"{request.tenant}.{root_domain}"
        if is_prod
        else f"{request.tenant}.localhost"
    )
    params["site_name"] = site_name

    # --- Step 4: Execute tool ---
    tool_result = run_tool(
        tool_name, 
        params, 
        site_name=site_name, 
        api_key=request.api_key, 
        api_secret=request.api_secret
    )

    # --- Step 5: Format response ---
    response = format_response(tool_result)

    return {
        "query": request.query,
        "tenant": request.tenant,
        "tool_used": tool_name,
        "intent_source": intent_source,
        "response": response,
    }


# ============================================================================
# Entry point
# ============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("ANALYTICS_PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)
