"""
ERPNext REST API Client
========================
Thin HTTP wrapper around the Frappe/ERPNext REST API.

Auth uses the same `Authorization: token {API_KEY}:{API_SECRET}` format
as the main Nexus ERP frontend (see lib/api-client.ts and app/lib/api.ts).

Data is fetched via the `/api/resource/{doctype}` endpoint which is the
standard Frappe REST resource route — consistent with how the Next.js
frontend calls `frappe.client.get_list`.
"""

import os
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger("conversational_analytics.erpnext_client")

# ---------------------------------------------------------------------------
# Configuration — sourced from environment
# ---------------------------------------------------------------------------

ERPNEXT_URL = os.environ.get("ERPNEXT_URL", "http://127.0.0.1:8080")
ERPNEXT_API_KEY = os.environ.get("ERPNEXT_API_KEY", "")
ERPNEXT_API_SECRET = os.environ.get("ERPNEXT_API_SECRET", "")

REQUEST_TIMEOUT = 5.0  # seconds


class ERPNextClientError(Exception):
    """Raised when an ERPNext API call fails."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class ERPNextClient:
    """
    Lightweight, synchronous-compatible ERPNext REST client.

    Uses httpx for HTTP — matches the auth header format used by
    the Next.js API layer (`token {key}:{secret}`).
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        api_secret: str | None = None,
        timeout: float = REQUEST_TIMEOUT,
    ):
        self.base_url = (base_url or ERPNEXT_URL).rstrip("/")
        self.api_key = api_key or ERPNEXT_API_KEY
        self.api_secret = api_secret or ERPNEXT_API_SECRET
        self.timeout = timeout

        if not self.api_key or not self.api_secret:
            logger.warning(
                "ERPNext API credentials not configured — "
                "set ERPNEXT_API_KEY and ERPNEXT_API_SECRET"
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _auth_headers(self, site_name: str | None = None) -> dict[str, str]:
        """
        Build auth headers matching the pattern in lib/api-client.ts:
            Authorization: token {API_KEY}:{API_SECRET}
        Optionally includes X-Frappe-Site-Name for multi-tenant routing.
        """
        headers: dict[str, str] = {
            "Authorization": f"token {self.api_key}:{self.api_secret}",
            "Accept": "application/json",
        }
        if site_name:
            headers["X-Frappe-Site-Name"] = site_name
        return headers

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_list(
        self,
        doctype: str,
        fields: list[str] | None = None,
        filters: list[list] | None = None,
        limit: int = 20,
        order_by: str | None = None,
        site_name: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetch a list of documents from ERPNext.

        Maps to:  GET /api/resource/{doctype}
        Which is the same underlying call as `frappe.client.get_list`.

        Args:
            doctype:   ERPNext DocType name (e.g. "Sales Invoice")
            fields:    List of field names to return
            filters:   Frappe-style filter list: [["field", "op", "value"], ...]
            limit:     Max rows (capped at 500 by the caller / tool layer)
            order_by:  SQL-style ordering, e.g. "posting_date desc"
            site_name: Optional tenant site for X-Frappe-Site-Name header
        """
        import json

        url = f"{self.base_url}/api/resource/{doctype}"

        params: dict[str, str] = {
            "limit_page_length": str(min(limit, 500)),
        }
        if fields:
            params["fields"] = json.dumps(fields)
        if filters:
            params["filters"] = json.dumps(filters)
        if order_by:
            params["order_by"] = order_by

        try:
            response = httpx.get(
                url,
                params=params,
                headers=self._auth_headers(site_name),
                timeout=self.timeout,
            )
            response.raise_for_status()
        except httpx.TimeoutException:
            logger.error(f"ERPNext request timed out after {self.timeout}s: {doctype}")
            raise ERPNextClientError(
                f"ERPNext request timed out after {self.timeout}s",
                status_code=504,
            )
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            if status in (401, 403):
                logger.critical(
                    f"ERPNext auth failure ({status}) for {doctype}: "
                    f"check ERPNEXT_API_KEY / ERPNEXT_API_SECRET"
                )
            else:
                logger.error(
                    f"ERPNext HTTP {status} for {doctype}: {exc.response.text[:300]}"
                )
            raise ERPNextClientError(
                f"ERPNext returned HTTP {status}",
                status_code=status,
            )
        except httpx.HTTPError as exc:
            logger.error(f"ERPNext connection error for {doctype}: {exc}")
            raise ERPNextClientError(f"ERPNext connection error: {exc}")

        data = response.json()
        # Frappe REST resource endpoint returns {"data": [...]}
        return data.get("data", [])
