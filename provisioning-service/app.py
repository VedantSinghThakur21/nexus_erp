"""
Nexus ERP — Production-Grade Provisioning Service
===================================================
A FastAPI microservice that orchestrates tenant provisioning by executing
commands inside the existing Frappe backend container via `docker exec`.

WHY THIS EXISTS:
- Node.js cannot reliably create Frappe sites via shell pipes
- Running bench commands requires the full Frappe environment (virtualenv, apps)
- This service uses `docker exec` to run commands inside the backend container
  where everything is properly installed
- It exposes clean REST endpoints that Next.js calls over HTTP

DEPLOYMENT:
- Runs as a separate lightweight container with Docker socket access
- Executes bench/frappe commands inside frappe_docker-backend-1
- Listens on port 8001 (mapped to 8002 externally)

SECURITY:
- Protected by a shared secret (PROVISIONING_API_SECRET)
- Only the Next.js server can call this — never exposed publicly
"""

import os
import json
import base64
import subprocess
import secrets
import logging
import time
import asyncio
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Optional, Any
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from pydantic import BaseModel, EmailStr, field_validator
import uvicorn

from agent_doctypes import (
    AGENT_ACTION_LOG_CUSTOM_FIELDS,
    build_seed_agent_doctypes_frappe_code,
    load_agent_doctype_fixtures,
)

# ============================================================================
# Configuration
# ============================================================================

BACKEND_CONTAINER = os.environ.get("BACKEND_CONTAINER", "frappe_docker-backend-1")
BENCH_PATH = os.environ.get("BENCH_PATH", "/home/frappe/frappe-bench")
MASTER_SITE = os.environ.get("MASTER_SITE_NAME", "erp.localhost")
PARENT_DOMAIN = os.environ.get("PARENT_DOMAIN", "avariq.in")
DB_ROOT_PASSWORD = os.environ.get("DB_ROOT_PASSWORD", "123")
PROVISIONING_SECRET = os.environ.get("PROVISIONING_API_SECRET", "change-me-in-production")
DEFAULT_APPS = os.environ.get("DEFAULT_APPS", "erpnext,nexus_core").split(",")
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "production") == "production"
# Same URL Nexus uses (ERP_NEXT_URL) — validate tokens the way server-side API calls do.
FRAPPE_INTERNAL_URL = os.environ.get("FRAPPE_INTERNAL_URL", "http://127.0.0.1:8080").rstrip("/")

REQUIRED_ERP_ROLES = [
    "System Manager",
    "Sales Manager",
    "Sales User",
    "Accounts Manager",
    "Accounts User",
    "Projects Manager",
    "Projects User",
    "Stock Manager",
    "Stock User",
    "Employee",
]

DOC_PERM_MINIMUM = [
    # System Manager always gets full access — this role is the "super-admin"
    # in every ERPNext installation. Without explicit DocPerm rows the default
    # ERPNext permission matrix may be missing them on a fresh tenant or after
    # a bench upgrade, so we assert them unconditionally. This also protects
    # admin users whose site-level role set cannot include Sales Manager (e.g.
    # when that Role record doesn't exist yet on a new site).
    {"doctype": "Lead", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Lead", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Lead", "role": "Sales User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Opportunity", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Opportunity", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Opportunity", "role": "Sales User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Quotation", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Quotation", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Quotation", "role": "Sales User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Quotation", "role": "Accounts Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Sales Order", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Sales Order", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Sales Order", "role": "Sales User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Sales Order", "role": "Accounts Manager", "read": 1, "write": 1, "create": 1, "delete": 0},
    {"doctype": "Sales Order", "role": "Accounts User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Sales Order", "role": "Projects Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Sales Invoice", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Sales Invoice", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Sales Invoice", "role": "Sales User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Sales Invoice", "role": "Accounts Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Sales Invoice", "role": "Accounts User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Sales Invoice", "role": "Projects Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Payment Entry", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Payment Entry", "role": "Accounts Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Payment Entry", "role": "Accounts User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Payment Entry", "role": "Sales Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Project", "role": "Projects Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Project", "role": "Projects User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Project", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Project", "role": "Sales Manager", "read": 1, "write": 1, "create": 0, "delete": 0},
    {"doctype": "Project", "role": "Accounts Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Project", "role": "Employee", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Booking", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Booking", "role": "Sales User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Booking", "role": "Projects Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Booking", "role": "Projects User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Booking", "role": "Accounts Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Booking", "role": "Stock Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Item", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 0},
    {"doctype": "Item", "role": "Sales User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Item", "role": "Stock Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Item", "role": "Stock User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Item", "role": "Projects Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Item", "role": "Projects User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Agent Action Log", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 0},
    {"doctype": "Agent Action Log", "role": "Projects Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Agent Action Log", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Agent Audit Log", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Agent Audit Log", "role": "Sales Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    # Quality inspections (ERPNext built-in doctype).
    # Required by the Nexus "Inspections" module which uses Quality Inspection as its backing store.
    {"doctype": "Quality Inspection", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Quality Inspection", "role": "Projects Manager", "read": 1, "write": 1, "create": 1, "delete": 0},
    {"doctype": "Quality Inspection", "role": "Stock Manager", "read": 1, "write": 1, "create": 1, "delete": 0},
    {"doctype": "Quality Inspection", "role": "Stock User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Quality Inspection", "role": "Sales Manager", "read": 1, "write": 0, "create": 0, "delete": 0},
    # Operators module: backed by ERPNext "Employee" (HR) doctype.
    # ERPNext does not guarantee create permission for Employee for our role set,
    # so we enforce a minimal matrix here.
    {"doctype": "Employee", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Employee", "role": "Projects Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Employee", "role": "Stock Manager", "read": 1, "write": 1, "create": 1, "delete": 0},
    {"doctype": "Employee", "role": "Stock User", "read": 1, "write": 0, "create": 0, "delete": 0},
    {"doctype": "Pricing Rule", "role": "Sales Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"doctype": "Pricing Rule", "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
]

INVITE_TYPE_TO_ROLE = {
    "admin": "System Manager",
    "sales": "Sales Manager",
    "accounts": "Accounts Manager",
    "projects": "Projects Manager",
    "member": "Employee",
}

DIRECT_ASSIGNABLE_ROLES = {
    "Sales User",
    "Accounts User",
    "Projects User",
    "Stock Manager",
    "Stock User",
}

MANAGER_ROLES = {"Sales Manager", "Accounts Manager", "Projects Manager", "Stock Manager"}

# Reuse freshly generated keys across parallel Next.js workers / dashboard requests.
# Regenerating invalidates the previous secret and causes 401 races.
_GENERATED_USER_KEYS_CACHE: dict[str, tuple[str, str, float]] = {}
_GENERATED_USER_KEYS_TTL_SEC = 120
_generate_keys_locks: dict[str, asyncio.Lock] = {}

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("provisioning")

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Nexus ERP Provisioning Service",
    version="2.0.0",
    docs_url="/docs" if not IS_PRODUCTION else None,
)

# ============================================================================
# Auth Dependency
# ============================================================================

async def verify_api_secret(x_provisioning_secret: str = Header(...)):
    """Verify the shared secret from Next.js server."""
    if x_provisioning_secret != PROVISIONING_SECRET:
        raise HTTPException(status_code=401, detail="Invalid provisioning secret")
    return True


# ============================================================================
# Models
# ============================================================================

class PlanType(str, Enum):
    FREE = "Free"
    PRO = "Pro"
    ENTERPRISE = "Enterprise"


class ProvisionRequest(BaseModel):
    organization_name: str
    admin_email: EmailStr
    admin_password: Optional[str] = None
    admin_full_name: Optional[str] = None
    plan_type: PlanType = PlanType.FREE
    confirmed_plan_type: Optional[PlanType] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None

    @field_validator("organization_name")
    @classmethod
    def validate_org_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Organization name must be 3-50 characters")
        if not all(c.isalnum() or c in " -_." for c in v):
            raise ValueError("Organization name contains invalid characters")
        return v


class ProvisionResponse(BaseModel):
    tenant: Optional[str] = None
    status: Optional[str] = None
    success: bool
    site_name: Optional[str] = None
    subdomain: Optional[str] = None
    admin_password: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    error: Optional[str] = None
    steps_completed: list[str] = []
    checks: Optional[dict[str, bool]] = None
    warnings: list[str] = []
    owner: Optional[dict[str, Any]] = None
    next_steps: list[str] = []


class HealthResponse(BaseModel):
    status: str
    backend_container: str
    master_site: str
    timestamp: str


class SubdomainCheckResponse(BaseModel):
    available: bool
    subdomain: str
    reason: Optional[str] = None


class TenantRecordLookupRequest(BaseModel):
    owner_email: Optional[EmailStr] = None
    username: Optional[str] = None
    user_email: Optional[EmailStr] = None


class TenantRecordLookupResponse(BaseModel):
    found: bool
    tenant: Optional[dict[str, Any]] = None


class TenantUserCreateRequest(BaseModel):
    user_email: EmailStr
    first_name: str
    last_name: Optional[str] = ""
    invite_type: Optional[str] = None
    role: Optional[str] = None


class TenantUserRoleChangeRequest(BaseModel):
    user_email: EmailStr
    new_role: str


# ============================================================================
# Helper Functions — All commands run via docker exec
# ============================================================================

def docker_exec(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    """
    Execute a command inside the Frappe backend container via docker exec.
    This is the ONLY place in the system where shell commands run.
    """
    cmd = ["docker", "exec", BACKEND_CONTAINER] + args
    logger.info(f"Running: docker exec {BACKEND_CONTAINER} {' '.join(args)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            logger.error(f"Command failed (exit {result.returncode})")
            logger.error(f"STDOUT: {result.stdout}")
            logger.error(f"STDERR: {result.stderr}")
        else:
            logger.info("Command succeeded")
            if result.stdout.strip():
                logger.debug(f"STDOUT: {result.stdout[:500]}")
        return result
    except subprocess.TimeoutExpired:
        logger.error(f"Command timed out after {timeout}s")
        raise HTTPException(status_code=504, detail=f"Command timed out after {timeout}s")


def run_bench_command(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    """Execute a bench command inside the backend container."""
    return docker_exec(
        ["bash", "-c", f"cd {BENCH_PATH} && bench {' '.join(args)}"],
        timeout=timeout,
    )


def run_frappe_code(site_name: str, python_code: str) -> str:
    """
    Execute Python code in the context of a specific Frappe site.
    
    Uses a temp-file approach with base64 encoding to avoid shell escaping
    issues when passing complex Python code through docker exec.
    """
    # Build the full script with Frappe init/destroy wrapper
    full_script = f"""import os
import sys
import frappe

# Ensure all log directories exist
os.makedirs("/home/frappe/logs", exist_ok=True)
os.makedirs("{BENCH_PATH}/logs", exist_ok=True)
os.makedirs("{BENCH_PATH}/sites/{site_name}/logs", exist_ok=True)

frappe.init(site="{site_name}", sites_path="{BENCH_PATH}/sites")
print(f"DEBUG: sites_path={{frappe.local.sites_path}}")
print(f"DEBUG: site_path={{frappe.local.site_path}}")

frappe.connect()
try:
{_indent(python_code, 4)}
finally:
    frappe.destroy()
"""

    # Base64 encode to avoid any shell/argument escaping issues
    encoded = base64.b64encode(full_script.encode()).decode()
    tmp_file = f"/tmp/_prov_{secrets.token_hex(8)}.py"

    # Write script to temp file inside backend container
    write_result = docker_exec(
        ["bash", "-c", f"echo '{encoded}' | base64 -d > {tmp_file}"],
        timeout=10,
    )
    if write_result.returncode != 0:
        raise Exception(f"Failed to write script to container: {write_result.stderr}")

    # Execute the script with Frappe's virtualenv Python
    # IMPORTANT: CWD must be the sites directory so Frappe's logger
    # resolves relative site paths correctly (site_name/logs/...)
    try:
        result = docker_exec(
            ["bash", "-c", f"cd {BENCH_PATH}/sites && {BENCH_PATH}/env/bin/python {tmp_file}"],
            timeout=120,
        )

        if result.returncode != 0:
            logger.error(f"Frappe code execution failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}")
            raise Exception(f"Frappe execution error: {result.stderr}")

        return result.stdout.strip()
    finally:
        # Cleanup temp file
        docker_exec(["rm", "-f", tmp_file], timeout=5)


def _indent(code: str, spaces: int) -> str:
    """Indent a block of code by N spaces."""
    prefix = " " * spaces
    return "\n".join(prefix + line for line in code.splitlines())


def seed_agent_doctypes_on_site(site_name: str) -> dict[str, Any]:
    """
    Import Agent Action Log + Agent Audit Log on a tenant site (idempotent).
    Also upserts custom fields when Action Log already exists from an older schema.
    """
    fixtures = load_agent_doctype_fixtures()
    code = build_seed_agent_doctypes_frappe_code(fixtures, AGENT_ACTION_LOG_CUSTOM_FIELDS)
    return _parse_json_output(run_frappe_code(site_name, code))


def generate_subdomain(org_name: str) -> str:
    """Convert organization name to a valid subdomain slug."""
    import re
    slug = org_name.lower()
    slug = re.sub(r"[^a-z0-9]", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")

    if len(slug) < 3:
        slug = slug + "-org"
    if len(slug) > 63:
        slug = slug[:63].rstrip("-")

    return slug


def get_site_name(subdomain: str) -> str:
    return f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"


def _frappe_effective_base_url(_site_name: str) -> str:
    """Direct Frappe URL only — never tenant Next.js subdomain (testorg.avariq.in)."""
    direct = os.environ.get("ERP_FRAPPE_DIRECT_URL", "").rstrip("/")
    if direct:
        return direct
    return FRAPPE_INTERNAL_URL


def _frappe_site_headers(site_name: str, base_url: str) -> dict[str, str]:
    """Headers for multi-tenant Frappe when calling via loopback/internal URL."""
    headers = {"X-Frappe-Site-Name": site_name}
    try:
        host = urllib.parse.urlparse(base_url).hostname or ""
    except Exception:
        host = ""
    if site_name and "." in site_name and host in ("127.0.0.1", "localhost", "host.docker.internal", "::1"):
        headers["Host"] = site_name
    return headers


def _frappe_api_json(
    site_name: str,
    path: str,
    method: str = "GET",
    headers: Optional[dict[str, str]] = None,
    body: Optional[dict[str, Any]] = None,
    timeout: int = 15,
) -> dict[str, Any]:
    """Call Frappe via tenant FQDN or internal URL + site headers (matches Nexus api.ts)."""
    base_url = _frappe_effective_base_url(site_name)
    encoded_body = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{base_url}{path}",
        method=method,
        data=encoded_body,
    )
    req.add_header("Content-Type", "application/json")
    for key, value in _frappe_site_headers(site_name, base_url).items():
        req.add_header(key, value)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def _http_json(
    site_name: str,
    path: str,
    method: str = "GET",
    headers: Optional[dict[str, str]] = None,
    body: Optional[dict[str, Any]] = None,
    timeout: int = 15,
) -> dict[str, Any]:
    schemes = ["https", "http"] if IS_PRODUCTION else ["http"]
    encoded_body = json.dumps(body).encode() if body is not None else None
    final_error: Optional[Exception] = None

    for scheme in schemes:
        try:
            req = urllib.request.Request(
                f"{scheme}://{site_name}{path}",
                method=method,
                data=encoded_body,
            )
            req.add_header("Content-Type", "application/json")
            for key, value in (headers or {}).items():
                req.add_header(key, value)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except Exception as exc:
            final_error = exc
            continue

    if final_error:
        raise final_error
    raise Exception("HTTP request failed")


def _validate_user_api_token_bench(
    site_name: str, user_email: str, api_key: str, api_secret: str
) -> bool:
    """Validate API keys inside the Frappe site context (same check as HTTP auth)."""
    safe_email = json.dumps(user_email)
    safe_key = json.dumps(api_key)
    safe_secret = json.dumps(api_secret)
    code = f"""import json
import frappe
from frappe.auth import validate_api_key_secret

user_email = {safe_email}
api_key = {safe_key}
api_secret = {safe_secret}

try:
    if not frappe.db.get_value("User", user_email, "enabled"):
        print(json.dumps({{"valid": False, "reason": "user_disabled"}}))
    elif frappe.db.get_value("User", {{"api_key": api_key}}, "name") != user_email:
        print(json.dumps({{"valid": False, "reason": "user_mismatch"}}))
    else:
        try:
            validate_api_key_secret(api_key, api_secret, authorization_source="header")
            print(json.dumps({{"valid": True, "method": "frappe.auth.validate_api_key_secret"}}))
        except Exception as auth_exc:
            print(json.dumps({{"valid": False, "reason": "auth_rejected", "error": str(auth_exc)}}))
except Exception as exc:
    print(json.dumps({{"valid": False, "error": str(exc)}}))
"""
    try:
        output = run_frappe_code(site_name, code)
        result = _parse_json_output(output)
        return bool(result.get("valid"))
    except Exception as exc:
        logger.warning(f"bench token validation failed for {user_email} on {site_name}: {exc}")
        return False


def _validate_user_api_token(site_name: str, user_email: str, api_key: str, api_secret: str) -> bool:
    # Prefer in-process validation — provisioning often runs in Docker where
    # FRAPPE_INTERNAL_URL (127.0.0.1:8080) does not reach the host Frappe port.
    if _validate_user_api_token_bench(site_name, user_email, api_key, api_secret):
        return True
    try:
        auth = _frappe_api_json(
            site_name,
            "/api/method/frappe.auth.get_logged_user",
            headers={
                "Authorization": f"token {api_key}:{api_secret}",
            },
        )
        return auth.get("message") == user_email
    except Exception:
        return False


def _http_check_user_api_token(
    site_name: str,
    user_email: str,
    api_key: str,
    api_secret: str,
    retries: int = 4,
    delay: float = 0.4,
) -> str:
    """Check keys over HTTP exactly like Frappe's web auth (and the Nexus app) does.

    Returns one of:
      - "ok":          a reachable endpoint authenticated the keys as user_email
      - "rejected":    a reachable endpoint returned 401/403 for the keys
      - "unreachable": no endpoint could be reached (e.g. provisioning runs in
                       Docker and cannot hit Frappe over HTTP)

    `_validate_user_api_token` short-circuits on the bench check and reports keys
    as valid even when Frappe's HTTP layer rejects them — the bench-valid-but-
    HTTP-401 gap that drives the client-side rotation storm. This asserts the
    keys actually authenticate over the same channel the web app uses, retrying
    briefly to absorb commit/propagation timing, while degrading gracefully when
    HTTP simply isn't reachable from here.
    """
    path = "/api/method/frappe.auth.get_logged_user"
    headers = {
        "Authorization": f"token {api_key}:{api_secret}",
        "Content-Type": "application/json",
    }

    urls: list[tuple[str, dict[str, str]]] = [
        (f"{FRAPPE_INTERNAL_URL}{path}", {**headers, "X-Frappe-Site-Name": site_name}),
    ]
    for scheme in (["https", "http"] if IS_PRODUCTION else ["http"]):
        urls.append((f"{scheme}://{site_name}{path}", dict(headers)))

    last = "unreachable"
    for attempt in range(retries):
        for url, hdrs in urls:
            req = urllib.request.Request(url, method="GET")
            for key, value in hdrs.items():
                req.add_header(key, value)
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    raw = resp.read().decode("utf-8")
                    data = json.loads(raw) if raw else {}
                    if data.get("message") == user_email:
                        return "ok"
                    last = "rejected"
            except urllib.error.HTTPError as exc:
                # A response came back, so Frappe is reachable. 401/403 means the
                # keys genuinely do not authenticate.
                last = "rejected" if exc.code in (401, 403) else "unreachable"
            except Exception:
                # Connection refused / DNS / timeout — cannot conclude anything.
                if last != "rejected":
                    last = "unreachable"
        if last == "rejected" and attempt < retries - 1:
            time.sleep(delay)
        elif last != "rejected":
            # Unreachable won't fix itself within this call; stop early.
            break
    return last


def _read_user_api_keys(site_name: str, user_email: str) -> tuple[Optional[str], Optional[str]]:
    """Read the currently stored api_key + decrypted api_secret for a user."""
    safe_email = json.dumps(user_email)
    code = f"""import json
import frappe

user_email = {safe_email}
try:
    user = frappe.get_doc("User", user_email)
    secret = user.get_password("api_secret")
    print(json.dumps({{"api_key": user.api_key, "api_secret": secret}}))
except Exception as exc:
    print(json.dumps({{"error": str(exc)}}))
"""
    try:
        res = _parse_json_output(run_frappe_code(site_name, code))
        if res.get("error"):
            return None, None
        return res.get("api_key"), res.get("api_secret")
    except Exception:
        return None, None


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check — verifies Docker connectivity to backend container."""
    try:
        result = docker_exec(["echo", "ok"], timeout=5)
        status = "healthy" if result.returncode == 0 else "degraded"
    except Exception:
        status = "degraded"

    return HealthResponse(
        status=status,
        backend_container=BACKEND_CONTAINER,
        master_site=MASTER_SITE,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.get("/api/v1/check-subdomain/{subdomain}", response_model=SubdomainCheckResponse)
async def check_subdomain(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """Check if a subdomain is available by querying the Master DB."""
    subdomain = generate_subdomain(subdomain)

    try:
        output = run_frappe_code(MASTER_SITE, f"""
import json
exists = frappe.db.exists("SaaS Tenant", {{"subdomain": "{subdomain}"}})
print(json.dumps({{"exists": bool(exists)}}))
""")
        result = _parse_json_output(output)

        if result.get("exists"):
            return SubdomainCheckResponse(
                available=False,
                subdomain=subdomain,
                reason="Subdomain already taken",
            )
        return SubdomainCheckResponse(available=True, subdomain=subdomain)

    except Exception as e:
        logger.warning(f"Subdomain check failed, assuming available: {e}")
        return SubdomainCheckResponse(available=True, subdomain=subdomain)


TENANT_RECORD_FIELDS = [
    "name",
    "subdomain",
    "site_url",
    "status",
    "owner_email",
    "site_config",
    "api_key",
]

# Frappe get_all filters must be a list of conditions, each condition a 3-tuple list.
# WRONG: ["status", "in", ["Active"]]          — flat 3-element list
# RIGHT: [["status", "in", ["Active", ...]]]   — list wrapping one condition
ACTIVE_TENANT_STATUS_FILTERS = [
    ["status", "in", ["Active", "active", "provisioned", "Provisioned"]]
]


def _bench_literal(value) -> str:
    """JSON literal embedded in bench console scripts (fields/filters must stay flat)."""
    return json.dumps(value)


def _lookup_saas_tenant_on_master(filters: dict) -> dict:
    """Read SaaS Tenant on the master site with ignore_permissions (bench console)."""
    code = f"""
import json
rows = frappe.get_all(
    "SaaS Tenant",
    filters={_bench_literal(filters)},
    fields={_bench_literal(TENANT_RECORD_FIELDS)},
    limit=1,
    ignore_permissions=True,
)
print(json.dumps({{"found": bool(rows), "tenant": rows[0] if rows else None}}, default=str))
"""
    output = run_frappe_code(MASTER_SITE, code)
    return _parse_json_output(output)


def _list_active_saas_tenant_rows(limit: int = 100) -> list[dict]:
    """Active/provisioned tenants from master — tolerates mixed status casing."""
    code = f"""
import json
rows = frappe.get_all(
    "SaaS Tenant",
    filters={_bench_literal(ACTIVE_TENANT_STATUS_FILTERS)},
    fields={_bench_literal(TENANT_RECORD_FIELDS)},
    limit={limit},
    ignore_permissions=True,
)
print(json.dumps({{"tenants": rows}}, default=str))
"""
    parsed = _parse_json_output(run_frappe_code(MASTER_SITE, code))
    return parsed.get("tenants") or []


def _find_tenants_for_user_email(user_email: str) -> list[dict]:
    """All workspaces where user_email is owner or has a User record on the tenant site."""
    seen: set[str] = set()
    matches: list[dict] = []

    owner_result = _lookup_saas_tenant_on_master({"owner_email": user_email})
    if owner_result.get("found") and owner_result.get("tenant"):
        row = owner_result["tenant"]
        sub = row.get("subdomain")
        if sub:
            seen.add(sub)
            matches.append(row)

    for row in _list_active_saas_tenant_rows():
        subdomain = row.get("subdomain")
        if not subdomain or subdomain in seen:
            continue
        site_name = get_site_name(subdomain)
        check_code = f"""
import json
rows = frappe.get_all(
    "User",
    filters={_bench_literal([["name", "=", user_email]])},
    fields={_bench_literal(["name", "api_key", "api_secret"])},
    limit=1,
)
print(json.dumps({{"exists": bool(rows)}}))
"""
        try:
            check_output = run_frappe_code(site_name, check_code)
            check_result = _parse_json_output(check_output)
            if check_result.get("exists"):
                seen.add(subdomain)
                matches.append(row)
        except Exception as check_err:
            logger.warning(f"tenant-by-user: skip {site_name}: {check_err}")
            continue

    return matches


@app.get("/api/v1/tenant-record/active-subdomains")
async def list_active_tenant_subdomains(_auth: bool = Depends(verify_api_secret)):
    """List active tenant subdomains from the Master DB (for root-domain login discovery)."""
    try:
        code = f"""
import json
rows = frappe.get_all(
    "SaaS Tenant",
    filters={_bench_literal(ACTIVE_TENANT_STATUS_FILTERS)},
    fields={_bench_literal(["subdomain"])},
    limit=100,
    ignore_permissions=True,
)
print(json.dumps({{"subdomains": [r["subdomain"] for r in rows if r.get("subdomain")]}}, default=str))
"""
        output = run_frappe_code(MASTER_SITE, code)
        parsed = _parse_json_output(output)
        return {"subdomains": parsed.get("subdomains") or []}
    except Exception as e:
        logger.error(f"active-subdomains list failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/tenant-by-user")
async def get_tenants_by_user(email: str, _auth: bool = Depends(verify_api_secret)):
    """
    List all tenant workspaces an email can access (owner or invited User on tenant site).
    Used by root-domain login and Google OAuth to resolve workspace without manual entry.
    """
    user_email = (email or "").strip()
    if not user_email or "@" not in user_email:
        raise HTTPException(status_code=400, detail="A valid email query parameter is required")

    try:
        rows = _find_tenants_for_user_email(user_email)
        tenants = []
        for row in rows:
            subdomain = row.get("subdomain")
            if not subdomain:
                continue
            site_name = get_site_name(subdomain)
            site_url = row.get("site_url") or (
                f"https://{site_name}" if IS_PRODUCTION else f"http://{site_name}"
            )
            tenants.append({
                "subdomain": subdomain,
                "site_name": site_name,
                "site_url": site_url,
                "display_name": site_url.replace("https://", "").replace("http://", ""),
                "status": row.get("status"),
                "owner_email": row.get("owner_email"),
            })
        return {"tenants": tenants}
    except Exception as e:
        logger.error(f"tenant-by-user failed for {user_email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/user-login-hint/{subdomain}")
async def get_user_login_hint(
    subdomain: str,
    email: str,
    _auth: bool = Depends(verify_api_secret),
):
    """Whether a tenant user exists and uses social/OAuth login (for login error hints)."""
    user_email = (email or "").strip()
    if not user_email or "@" not in user_email:
        raise HTTPException(status_code=400, detail="A valid email query parameter is required")

    site_name = get_site_name(subdomain)
    code = f"""import json
email = {json.dumps(user_email)}
hint = {{"exists": False, "has_social_login": False, "providers": []}}
if not frappe.db.exists("User", email):
    print(json.dumps(hint))
else:
    hint["exists"] = True
    user = frappe.get_doc("User", email)
    for row in user.get("social_logins") or []:
        prov = row.provider if hasattr(row, "provider") else (row.get("provider") if isinstance(row, dict) else None)
        if prov:
            hint["providers"].append(str(prov))
    if not hint["providers"]:
        for row in frappe.get_all("User Social Login", filters={{"parent": email}}, fields=["provider"]) or []:
            if row.get("provider"):
                hint["providers"].append(str(row["provider"]))
    hint["has_social_login"] = len(hint["providers"]) > 0
    print(json.dumps(hint))
"""
    try:
        output = run_frappe_code(site_name, code)
        return _parse_json_output(output)
    except Exception as e:
        logger.error(f"user-login-hint failed for {site_name}/{user_email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/tenant-record/subdomain/{subdomain}", response_model=TenantRecordLookupResponse)
async def get_tenant_record_by_subdomain(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """Resolve a tenant by subdomain from the Master DB (ignores API user DocPerms)."""
    import re
    normalized = subdomain.strip().lower()
    if not re.match(r"^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$", normalized):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")
    try:
        result = _lookup_saas_tenant_on_master({"subdomain": normalized})
        return TenantRecordLookupResponse(
            found=bool(result.get("found")),
            tenant=result.get("tenant"),
        )
    except Exception as e:
        logger.error(f"tenant-record subdomain lookup failed for {subdomain}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/tenant-record/lookup", response_model=TenantRecordLookupResponse)
async def lookup_tenant_record(req: TenantRecordLookupRequest, _auth: bool = Depends(verify_api_secret)):
    """Resolve a tenant by owner email, member user email, or master-site username."""
    if not req.owner_email and not req.username and not req.user_email:
        raise HTTPException(status_code=400, detail="owner_email, user_email, or username is required")

    try:
        if req.owner_email:
            result = _lookup_saas_tenant_on_master({"owner_email": str(req.owner_email)})
            return TenantRecordLookupResponse(
                found=bool(result.get("found")),
                tenant=result.get("tenant"),
            )

        if req.user_email:
            user_email = str(req.user_email)
            rows = _find_tenants_for_user_email(user_email)
            if rows:
                return TenantRecordLookupResponse(found=True, tenant=rows[0])
            return TenantRecordLookupResponse(found=False, tenant=None)

        code = f"""
import json
user_email = frappe.db.get_value("User", {{"username": {json.dumps(req.username)}}}, "email")
if not user_email:
    print(json.dumps({{"found": False, "tenant": None}}))
else:
    rows = frappe.get_all(
        "SaaS Tenant",
        filters={{"owner_email": user_email}},
        fields={_bench_literal(TENANT_RECORD_FIELDS)},
        limit=1,
        ignore_permissions=True,
    )
    print(json.dumps({{"found": bool(rows), "tenant": rows[0] if rows else None}}, default=str))
"""
        output = run_frappe_code(MASTER_SITE, code)
        result = _parse_json_output(output)
        return TenantRecordLookupResponse(
            found=bool(result.get("found")),
            tenant=result.get("tenant"),
        )
    except Exception as e:
        logger.error(f"tenant-record lookup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/provision", response_model=ProvisionResponse)
async def provision_tenant(req: ProvisionRequest, _auth: bool = Depends(verify_api_secret)):
    """Provision a tenant with strict role + DocPerm enforcement."""
    subdomain = generate_subdomain(req.organization_name)
    site_name = get_site_name(subdomain)
    admin_password = req.admin_password or secrets.token_urlsafe(16)
    steps_completed: list[str] = []
    api_key: Optional[str] = None
    api_secret: Optional[str] = None

    logger.info(f"═══ PROVISIONING START: {site_name} ═══")
    logger.info(f"  org={req.organization_name} email={req.admin_email} plan={req.plan_type.value}")

    # Step 0: pre-flight (idempotency guard)
    try:
        output = run_frappe_code(MASTER_SITE, f"""
import json
subdomain_exists = frappe.db.exists("SaaS Tenant", {{"subdomain": "{subdomain}"}})
email_exists = frappe.db.count("SaaS Tenant", {{"owner_email": "{req.admin_email}"}})
print(json.dumps({{"subdomain_exists": bool(subdomain_exists), "email_exists": int(email_exists)}}, default=str))
""")
        preflight = _parse_json_output(output)

        if preflight.get("subdomain_exists"):
            logger.warning(f"Subdomain '{subdomain}' already exists")
            return ProvisionResponse(
                success=True,
                site_name=site_name,
                subdomain=subdomain,
                admin_password=admin_password,
                error="Tenant already exists",
                steps_completed=["preflight_duplicate"],
            )

        if preflight.get("email_exists", 0) > 0:
            return ProvisionResponse(
                success=False,
                error=f"Email {req.admin_email} already owns a tenant",
            )

        steps_completed.append("preflight_ok")
    except Exception as e:
        logger.warning(f"Pre-flight check failed, proceeding anyway: {e}")

    # Step 1: create site
    try:
        result = run_bench_command(
            [
                "new-site",
                site_name,
                "--admin-password",
                admin_password,
                "--mariadb-root-password",
                DB_ROOT_PASSWORD,
                "--install-app",
                "erpnext",
                "--no-mariadb-socket",
            ],
            timeout=480,
        )

        if result.returncode != 0:
            if "already exists" in (result.stderr + result.stdout).lower():
                logger.info(f"Site {site_name} already exists, continuing")
                steps_completed.append("site_exists")
            else:
                raise Exception(f"bench new-site failed: {result.stderr}")
        else:
            steps_completed.append("site_created")
    except Exception as e:
        logger.error(f"Site creation failed: {e}")
        return ProvisionResponse(success=False, error=str(e), steps_completed=steps_completed)

    # Step 1b: ping check (must pass before continuing)
    try:
        ping_result = _http_json(site_name, "/api/method/frappe.ping")
        if ping_result.get("message") != "pong":
            raise Exception(f"Unexpected ping response: {ping_result}")
        steps_completed.append("ping_ok")
    except Exception as e:
        logger.error(f"Ping check failed for {site_name}: {e}")
        return ProvisionResponse(
            success=False,
            site_name=site_name,
            subdomain=subdomain,
            error=f"Site ping failed; remediation: verify site install and reload nginx ({e})",
            steps_completed=steps_completed,
        )

    # Step 2: install extra apps (erpnext is already installed in new-site)
    for app_name in DEFAULT_APPS:
        app_name = app_name.strip()
        if not app_name or app_name == "erpnext":
            continue
        try:
            result = run_bench_command(["--site", site_name, "install-app", app_name], timeout=480)

            if result.returncode != 0:
                if "already installed" in (result.stderr + result.stdout).lower():
                    logger.info(f"App '{app_name}' already installed")
                else:
                    logger.warning(f"install-app {app_name} failed: {result.stderr[:300]}")

            steps_completed.append(f"app_installed:{app_name}")
        except Exception as e:
            logger.warning(f"Failed to install {app_name}: {e}")

    # Step 3: ensure required roles exist
    try:
        roles_code = f"""
import json
required = {json.dumps(REQUIRED_ERP_ROLES)}
existing = set(r.name for r in frappe.get_all("Role", fields=["name"]))
missing = [r for r in required if r not in existing]
created = []
for role_name in missing:
    role_doc = frappe.new_doc("Role")
    role_doc.role_name = role_name
    role_doc.desk_access = 1
    role_doc.insert(ignore_permissions=True)
    created.append(role_name)
frappe.db.commit()
print(json.dumps({{"missing": missing, "created": created}}))
"""
        _parse_json_output(run_frappe_code(site_name, roles_code))
        steps_completed.append("roles_ensured")
    except Exception as e:
        logger.error(f"Required role validation failed: {e}")
        return ProvisionResponse(success=False, site_name=site_name, subdomain=subdomain, error=str(e), steps_completed=steps_completed)

    # Step 4: generate master (Administrator) API keys
    try:
        admin_key_code = """
import json
user = frappe.get_doc("User", "Administrator")
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)
user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({"api_key": api_key, "api_secret": api_secret}))
"""
        _parse_json_output(run_frappe_code(site_name, admin_key_code))
        steps_completed.append("administrator_keys_generated")
    except Exception as e:
        logger.error(f"Administrator key generation failed: {e}")
        return ProvisionResponse(success=False, site_name=site_name, subdomain=subdomain, error=str(e), steps_completed=steps_completed)

    # Step 5: create tenant owner with only System Manager + All
    try:
        first_name = (req.admin_full_name or req.organization_name).split(" ")[0]
        last_name = " ".join((req.admin_full_name or req.organization_name).split(" ")[1:])
        owner_code = f"""
import json
import frappe.utils.password
email = {json.dumps(str(req.admin_email))}
first_name = {json.dumps(first_name)}
last_name = {json.dumps(last_name)}
pwd = {json.dumps(admin_password)}

if frappe.db.exists("User", email):
    user = frappe.get_doc("User", email)
else:
    user = frappe.new_doc("User")
    user.email = email

user.first_name = first_name
user.last_name = last_name
user.enabled = 1
user.user_type = "System User"
user.send_welcome_email = 1
user.role_profile_name = None
user.flags.no_welcome_mail = False
frappe.utils.password.update_password(email, pwd)
owner_roles = ["System Manager", "Sales Manager", "Accounts Manager", "Projects Manager", "Stock Manager", "Employee", "All"]
user.roles = []
for role_name in owner_roles:
    user.append("roles", {"role": role_name, "doctype": "Has Role"})
user.save(ignore_permissions=True)

frappe.db.commit()
print(json.dumps({{"roles": [r.role for r in user.roles]}}, default=str))
"""
        _parse_json_output(run_frappe_code(site_name, owner_code))
        steps_completed.append("owner_created")
    except Exception as e:
        logger.error(f"Owner creation failed: {e}")
        _cleanup_failed_site(site_name)
        return ProvisionResponse(
            success=False,
            error=f"Owner user creation failed: {e}",
            steps_completed=steps_completed,
        )

    # Step 5b: verify owner roles and patch if required
    try:
        role_verify_code = f"""
import json
email = {json.dumps(str(req.admin_email))}
user = frappe.get_doc("User", email)
current_roles = [r.role for r in user.roles]
required = {"System Manager", "Sales Manager", "Accounts Manager", "Projects Manager", "Stock Manager", "Employee", "All"}
if set(current_roles) != required:
    user.roles = []
    for r in required:
        user.append("roles", {"role": r, "doctype": "Has Role"})
    user.save(ignore_permissions=True)
    frappe.db.commit()
    current_roles = [r.role for r in user.roles]
print(json.dumps({{"roles": current_roles}}))
"""
        verify_result = _parse_json_output(run_frappe_code(site_name, role_verify_code))
        roles = set(verify_result.get("roles", []))
        if "System Manager" not in roles or "All" not in roles:
            raise Exception(f"owner roles invalid: {verify_result}")
        steps_completed.append("owner_roles_verified")
    except Exception as e:
        return ProvisionResponse(success=False, site_name=site_name, subdomain=subdomain, error=str(e), steps_completed=steps_completed)

    # Step 5.9: Agent Action Log + Agent Audit Log (required for Agent Inbox / agentic-ai plugin)
    try:
        agent_dt_result = seed_agent_doctypes_on_site(site_name)
        if agent_dt_result.get("errors"):
            logger.warning(f"agent doctype seed errors for {site_name}: {agent_dt_result.get('errors')}")
        imported = agent_dt_result.get("imported") or []
        skipped = agent_dt_result.get("skipped") or []
        if not imported and not any(
            name in skipped for name in ("Agent Action Log", "Agent Audit Log")
        ):
            raise Exception(f"Agent doctypes not present after seed: {agent_dt_result}")
        steps_completed.append("agent_doctypes_seeded")
        logger.info(f"Agent doctypes for {site_name}: {agent_dt_result}")
    except Exception as e:
        logger.error(f"Agent doctype seed failed for {site_name}: {e}")
        return ProvisionResponse(
            success=False,
            site_name=site_name,
            subdomain=subdomain,
            error=f"Agent doctype setup failed: {e}",
            steps_completed=steps_completed,
        )

    # Step 6: set DocPerm matrix
    try:
        docperm_code = f"""
import json
matrix = {json.dumps(DOC_PERM_MINIMUM)}
updated = []
for row in matrix:
    filters = {{
        "parent": row["doctype"],
        "parenttype": "DocType",
        "parentfield": "permissions",
        "role": row["role"],
        "permlevel": 0,
    }}
    name = frappe.db.exists("DocPerm", filters)
    doc = frappe.get_doc("DocPerm", name) if name else frappe.new_doc("DocPerm")
    doc.parent = row["doctype"]
    doc.parenttype = "DocType"
    doc.parentfield = "permissions"
    doc.role = row["role"]
    doc.permlevel = 0
    doc.read = int(row["read"])
    doc.write = int(row["write"])
    doc.create = int(row["create"])
    doc.delete = int(row["delete"])
    doc.submit = 0
    doc.amend = 0
    if name:
        doc.save(ignore_permissions=True)
    else:
        doc.insert(ignore_permissions=True)
    updated.append(f'{{row["doctype"]}}:{{row["role"]}}')
frappe.db.commit()
# Refresh cached doctype meta so the new DocPerm rows take effect on live
# web workers (committing alone leaves workers on the stale perm matrix).
_cleared = []
for row in matrix:
    dt = row["doctype"]
    if dt not in _cleared:
        _cleared.append(dt)
        frappe.clear_cache(doctype=dt)
frappe.clear_cache()
print(json.dumps({{"updated": updated, "count": len(updated)}}))
"""
        docperm_result = _parse_json_output(run_frappe_code(site_name, docperm_code))
        if int(docperm_result.get("count", 0)) < len(DOC_PERM_MINIMUM):
            raise Exception(f"DocPerm incomplete: {docperm_result}")
        steps_completed.append("docperms_set")
    except Exception as e:
        return ProvisionResponse(success=False, site_name=site_name, subdomain=subdomain, error=f"DocPerm setup failed: {e}", steps_completed=steps_completed)

    # Step 6b: seed required Custom Fields (rental fields on line items)
    # This prevents Frappe from silently dropping the app's custom_* payload on insert/save.
    try:
        seed_cf_code = """import json

result = {"created": [], "skipped": [], "errors": []}
TARGET_DOCTYPES = ["Quotation Item", "Sales Order Item", "Sales Invoice Item"]
FIELD_SPECS = [
  {"fieldname": "custom_is_rental", "label": "Is Rental", "fieldtype": "Check", "insert_after": "description"},
  {"fieldname": "custom_rental_type", "label": "Rental Type", "fieldtype": "Select", "options": "Hours\\nDays\\nMonths", "insert_after": "custom_is_rental"},
  {"fieldname": "custom_rental_duration", "label": "Rental Duration", "fieldtype": "Int", "insert_after": "custom_rental_type"},
  {"fieldname": "custom_rental_start_date", "label": "Rental Start Date", "fieldtype": "Date", "insert_after": "custom_rental_duration"},
  {"fieldname": "custom_rental_end_date", "label": "Rental End Date", "fieldtype": "Date", "insert_after": "custom_rental_start_date"},
  {"fieldname": "custom_rental_start_time", "label": "Rental Start Time", "fieldtype": "Time", "insert_after": "custom_rental_end_date"},
  {"fieldname": "custom_rental_end_time", "label": "Rental End Time", "fieldtype": "Time", "insert_after": "custom_rental_start_time"},
  {"fieldname": "custom_requires_operator", "label": "Requires Operator", "fieldtype": "Check", "insert_after": "custom_rental_end_time"},
  {"fieldname": "custom_operator_included", "label": "Operator Included", "fieldtype": "Check", "insert_after": "custom_requires_operator"},
  {"fieldname": "custom_operator_name", "label": "Operator Name", "fieldtype": "Data", "insert_after": "custom_operator_included"},
  {"fieldname": "custom_base_rental_cost", "label": "Base Rental Cost", "fieldtype": "Currency", "insert_after": "custom_operator_name"},
  {"fieldname": "custom_accommodation_charges", "label": "Accommodation Charges", "fieldtype": "Currency", "insert_after": "custom_base_rental_cost"},
  {"fieldname": "custom_usage_charges", "label": "Usage Charges", "fieldtype": "Currency", "insert_after": "custom_accommodation_charges"},
  {"fieldname": "custom_fuel_charges", "label": "Fuel Charges", "fieldtype": "Currency", "insert_after": "custom_usage_charges"},
  {"fieldname": "custom_elongation_charges", "label": "Elongation Charges", "fieldtype": "Currency", "insert_after": "custom_fuel_charges"},
  {"fieldname": "custom_risk_charges", "label": "Risk Charges", "fieldtype": "Currency", "insert_after": "custom_elongation_charges"},
  {"fieldname": "custom_commercial_charges", "label": "Commercial Charges", "fieldtype": "Currency", "insert_after": "custom_risk_charges"},
  {"fieldname": "custom_incidental_charges", "label": "Incidental Charges", "fieldtype": "Currency", "insert_after": "custom_commercial_charges"},
  {"fieldname": "custom_other_charges", "label": "Other Charges", "fieldtype": "Currency", "insert_after": "custom_incidental_charges"},
  {"fieldname": "custom_total_rental_cost", "label": "Total Rental Cost", "fieldtype": "Currency", "insert_after": "custom_other_charges"},
  {"fieldname": "custom_rental_data", "label": "Rental Data", "fieldtype": "Long Text", "insert_after": "custom_total_rental_cost"},
]

def upsert(dt: str, spec: dict):
    try:
        if frappe.db.exists("Custom Field", {"dt": dt, "fieldname": spec["fieldname"]}):
            result["skipped"].append(f"{dt}:{spec['fieldname']}")
            return
        doc = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": dt,
            "fieldname": spec["fieldname"],
            "label": spec.get("label") or spec["fieldname"],
            "fieldtype": spec.get("fieldtype") or "Data",
            "insert_after": spec.get("insert_after") or "description",
            "options": spec.get("options") or None,
        })
        doc.insert(ignore_permissions=True)
        result["created"].append(f"{dt}:{spec['fieldname']}")
    except Exception as exc:
        result["errors"].append(f"{dt}:{spec.get('fieldname')}: {exc}")

for dt in TARGET_DOCTYPES:
    for spec in FIELD_SPECS:
        upsert(dt, spec)

frappe.db.commit()
print(json.dumps(result))
"""
        cf_result = _parse_json_output(run_frappe_code(site_name, seed_cf_code))
        steps_completed.append("custom_fields_seeded")
        if cf_result.get("errors"):
            logger.warning(f"custom field seed errors for {site_name}: {cf_result.get('errors')}")
    except Exception as e:
        # Non-fatal: the explicit endpoint can be called later, and the app will self-heal on login.
        logger.warning(f"Custom field seeding failed (non-fatal) for {site_name}: {e}")
        steps_completed.append("custom_fields_seed_failed")

    # Step 6c: seed tenant defaults (includes Fiscal Year + selling price list).
    # This is CRITICAL for production: without an active Fiscal Year that covers
    # today, ERPNext will block submissions with FiscalYearError.
    try:
        seed_code = """import json
import datetime

result = {"territory": "skipped", "customer_group": "skipped", "item_groups": "skipped", "opportunity_types": "skipped", "sales_stages": "skipped", "price_list": "skipped", "selling_settings": "skipped", "fiscal_year": "skipped"}

# Selling Price List (required for Quotation / Sales Order / Sales Invoice)
# Create "Standard Selling" if no selling+enabled price list exists, then
# set Selling Settings.selling_price_list to point at it.
existing_pl = frappe.get_all(
    "Price List",
    filters={"selling": 1, "enabled": 1},
    fields=["name"],
    limit=1,
)
if existing_pl:
    selling_pl_name = existing_pl[0].get("name")
    result["price_list"] = f"exists: {selling_pl_name}"
else:
    selling_pl_name = "Standard Selling"
    if not frappe.db.exists("Price List", selling_pl_name):
        tenant_currency = frappe.db.get_default("currency") or "INR"
        frappe.get_doc({
            "doctype": "Price List",
            "price_list_name": selling_pl_name,
            "selling": 1,
            "buying": 0,
            "enabled": 1,
            "currency": tenant_currency,
        }).insert(ignore_permissions=True)
        result["price_list"] = f"seeded: {selling_pl_name}"
    else:
        result["price_list"] = f"exists: {selling_pl_name}"

# Ensure Selling Settings has a default selling_price_list pointing at our list
try:
    selling_settings = frappe.get_single("Selling Settings")
    if not selling_settings.selling_price_list:
        selling_settings.selling_price_list = selling_pl_name
        selling_settings.save(ignore_permissions=True)
        result["selling_settings"] = f"set default: {selling_pl_name}"
    else:
        result["selling_settings"] = f"already set: {selling_settings.selling_price_list}"
except Exception as _ss_err:
    result["selling_settings"] = f"error: {_ss_err}"

# Fiscal Year (required to submit Sales Order / Invoice)
# Ensure today falls into an active fiscal year for the default company.
# Default to India-style FY: Apr 1 → Mar 31.
try:
    company = None
    try:
        gd = frappe.get_single("Global Defaults")
        company = getattr(gd, "default_company", None) or None
    except Exception:
        company = None
    if not company:
        company = frappe.db.get_default("company") or frappe.db.get_default("default_company")

    today = datetime.date.today()
    if today.month >= 4:
        start_year = today.year
        end_year = today.year + 1
    else:
        start_year = today.year - 1
        end_year = today.year

    fy_name = f"{start_year}-{end_year}"
    fy_start = datetime.date(start_year, 4, 1)
    fy_end = datetime.date(end_year, 3, 31)

    if not frappe.db.exists("Fiscal Year", fy_name):
        fy = frappe.get_doc({
            "doctype": "Fiscal Year",
            "year": fy_name,
            "year_start_date": fy_start,
            "year_end_date": fy_end,
            "disabled": 0,
        })
        if company:
            fy.append("companies", {"company": company})
        fy.insert(ignore_permissions=True)
        result["fiscal_year"] = f"seeded: {fy_name}"
    else:
        result["fiscal_year"] = f"exists: {fy_name}"

    # Mark enabled and ensure company link exists.
    fy = frappe.get_doc("Fiscal Year", fy_name)
    changed = False
    if int(getattr(fy, "disabled", 0) or 0) == 1:
        fy.disabled = 0
        changed = True
    if company:
        linked = any(getattr(c, "company", None) == company for c in (fy.companies or []))
        if not linked:
            fy.append("companies", {"company": company})
            changed = True
    if changed:
        fy.save(ignore_permissions=True)

    # Set Company default fiscal year if missing
    if company:
        try:
            comp = frappe.get_doc("Company", company)
            if not getattr(comp, "default_fiscal_year", None):
                comp.default_fiscal_year = fy_name
                comp.save(ignore_permissions=True)
        except Exception:
            pass
except Exception as _fy_err:
    result["fiscal_year"] = f"error: {_fy_err}"

frappe.db.commit()
print(json.dumps(result))
"""
        _parse_json_output(run_frappe_code(site_name, seed_code))
        steps_completed.append("defaults_seeded")
    except Exception as e:
        # Non-fatal, but we still surface it in steps so ops can see it.
        logger.warning(f"Defaults seeding failed (non-fatal) for {site_name}: {e}")
        steps_completed.append("defaults_seed_failed")

    # Step 7: generate API key for tenant admin
    try:
        owner_key_code = f"""
import json
email = {json.dumps(str(req.admin_email))}
user = frappe.get_doc("User", email)
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)
user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({{"api_key": api_key, "api_secret": api_secret}}))
"""
        owner_key_result = _parse_json_output(run_frappe_code(site_name, owner_key_code))
        api_key = owner_key_result.get("api_key")
        api_secret = owner_key_result.get("api_secret")
        if not api_key or not api_secret:
            raise Exception("owner api keys missing")
        steps_completed.append("owner_keys_generated")
    except Exception as e:
        return ProvisionResponse(success=False, site_name=site_name, subdomain=subdomain, error=f"Owner API key generation failed: {e}", steps_completed=steps_completed)

    # Existing behavior: register tenant in master DB
    try:
        protocol = "https" if IS_PRODUCTION else "http"
        site_url = f"{protocol}://{site_name}"

        register_code = f"""
import json

if not frappe.db.exists("SaaS Tenant", "{subdomain}"):
    doc = frappe.new_doc("SaaS Tenant")
    doc.subdomain = "{subdomain}"
    doc.company_name = "{req.organization_name}"
    doc.owner_email = "{req.admin_email}"
    doc.organization_name = "{req.organization_name}"
    doc.site_url = "{site_url}"
    doc.status = "Active"
    doc.plan_type = "{(req.confirmed_plan_type or req.plan_type).value}"
    doc.subscription_status = "Active"
    doc.stripe_customer_id = "{req.stripe_customer_id or ''}"
    doc.stripe_subscription_id = "{req.stripe_subscription_id or ''}"
    doc.admin_user = "{req.admin_email}"
    doc.api_key = "{api_key or ''}"
    doc.api_secret = "{api_secret or ''}"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(json.dumps({{"registered": True, "action": "created"}}))
else:
    doc = frappe.get_doc("SaaS Tenant", "{subdomain}")
    doc.status = "Active"
    doc.plan_type = "{(req.confirmed_plan_type or req.plan_type).value}"
    doc.site_url = "{site_url}"
    doc.api_key = "{api_key or ''}"
    doc.api_secret = "{api_secret or ''}"
    doc.stripe_customer_id = "{req.stripe_customer_id or ''}"
    doc.stripe_subscription_id = "{req.stripe_subscription_id or ''}"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print(json.dumps({{"registered": True, "action": "updated"}}))
"""
        output = run_frappe_code(MASTER_SITE, register_code)
        reg_result = _parse_json_output(output)

        steps_completed.append("master_db_registered")
        logger.info(f"Master DB registration ({reg_result.get('action', 'done')})")

    except Exception as e:
        logger.error(f"Master DB registration failed: {e}")
        return ProvisionResponse(
            success=False,
            site_name=site_name,
            subdomain=subdomain,
            admin_password=admin_password,
            api_key=api_key,
            api_secret=api_secret,
            error=f"Site created but Master DB registration failed: {e}. Manual fix required.",
            steps_completed=steps_completed,
        )

    # Step 8: validation checks (all must pass)
    warnings = []
    checks = {
        "site_alive": False,
        "user_exists": False,
        "roles_correct": False,
        "api_key_valid": False,
        "docperms_set": False,
    }
    try:
        checks["site_alive"] = _http_json(site_name, "/api/method/frappe.ping").get("message") == "pong"
    except Exception as e:
        warnings.append(f"site_alive failed; remediation attempted: ping retry; error={e}")
    try:
        user_data = _http_json(
            site_name,
            f"/api/resource/User/{req.admin_email}",
            headers={"Authorization": f"token {api_key}:{api_secret}", "X-Frappe-Site-Name": site_name},
        )
        user_doc = user_data.get("data", {})
        checks["user_exists"] = int(user_doc.get("enabled", 0)) == 1 and user_doc.get("user_type") == "System User"
        role_rows = user_doc.get("roles", [])
        owner_roles = {r.get("role") for r in role_rows if isinstance(r, dict)}
        checks["roles_correct"] = "System Manager" in owner_roles and "All" in owner_roles
    except Exception as e:
        warnings.append(f"user/roles check failed; remediation attempted: owner role patch; error={e}")
    try:
        auth_data = _http_json(
            site_name,
            "/api/method/frappe.auth.get_logged_user",
            headers={"Authorization": f"token {api_key}:{api_secret}", "X-Frappe-Site-Name": site_name},
        )
        checks["api_key_valid"] = auth_data.get("message") == str(req.admin_email)
    except Exception as e:
        warnings.append(f"api_key_valid failed; remediation attempted: regenerate owner keys; error={e}")
    try:
        spot = _http_json(
            site_name,
            '/api/resource/DocPerm?filters=[["parent","=","Lead"]]',
            headers={"Authorization": f"token {api_key}:{api_secret}", "X-Frappe-Site-Name": site_name},
        )
        entries = spot.get("data", [])
        sm = next((r for r in entries if r.get("role") == "Sales Manager"), None)
        su = next((r for r in entries if r.get("role") == "Sales User"), None)
        checks["docperms_set"] = bool(
            sm and su and int(sm.get("read", 0)) == 1 and int(sm.get("write", 0)) == 1 and int(sm.get("create", 0)) == 1 and int(sm.get("delete", 0)) == 1
            and int(su.get("read", 0)) == 1 and int(su.get("write", 0)) == 0 and int(su.get("create", 0)) == 0 and int(su.get("delete", 0)) == 0
        )
    except Exception as e:
        warnings.append(f"docperms spot-check failed; remediation attempted: docperm upsert rerun; error={e}")

    if not all(checks.values()):
        return ProvisionResponse(
                tenant=site_name,
                status="failed",
            success=False,
            site_name=site_name,
            subdomain=subdomain,
            admin_password=admin_password,
            api_key=api_key,
            api_secret=api_secret,
            error="Provisioning validation checks failed",
            steps_completed=steps_completed + ["validation_failed"],
            checks=checks,
            warnings=warnings,
                owner={"email": str(req.admin_email), "roles": ["System Manager", "All"], "api_key": "***stored***"},
        )

    # Keep prior nginx behavior for production.
    if IS_PRODUCTION:
        try:
            result = run_bench_command(["setup", "nginx", "--yes"], timeout=60)
            if result.returncode == 0:
                steps_completed.append("nginx_configured")
                logger.info("Nginx config generated")

                # Try multiple approaches to reload nginx (container may not have sudo)
                reload_cmds = [
                    ["nginx", "-s", "reload"],
                    ["bash", "-c", "kill -HUP $(cat /var/run/nginx.pid 2>/dev/null) 2>/dev/null || nginx -s reload"],
                    ["service", "nginx", "reload"],
                ]
                reloaded = False
                for cmd in reload_cmds:
                    try:
                        r = docker_exec(cmd, timeout=15)
                        if r.returncode == 0:
                            logger.info("Nginx reloaded")
                            reloaded = True
                            break
                    except Exception:
                        continue
                if not reloaded:
                    logger.warning("Nginx reload failed — may need manual reload")
        except Exception as e:
            logger.warning(f"Nginx setup failed (non-fatal): {e}")

    logger.info(f"═══ PROVISIONING COMPLETE: {site_name} ═══")
    logger.info(f"Steps: {steps_completed}")

    return ProvisionResponse(
        tenant=site_name,
        status="provisioned",
        success=True,
        site_name=site_name,
        subdomain=subdomain,
        admin_password=admin_password,
        api_key=api_key,
        api_secret=api_secret,
        steps_completed=steps_completed,
        checks=checks,
        warnings=warnings,
        owner={"email": str(req.admin_email), "roles": ["System Manager", "All"], "api_key": "***stored***"},
        next_steps=[
            f"Send welcome email to {req.admin_email}",
            "Tenant can now invite team members via /team page",
        ],
    )


@app.post("/api/v1/seed-defaults/{subdomain}")
async def seed_tenant_defaults(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """
    Re-seed tree defaults (Territory, Customer Group, Item Groups, CRM data) for an existing tenant.
    Uses ignore_permissions=True so regular tenant users don't need System Manager.
    Idempotent — safe to call multiple times.
    """
    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"

    seed_code = """import json
import datetime

result = {"territory": "skipped", "customer_group": "skipped", "item_groups": "skipped", "opportunity_types": "skipped", "sales_stages": "skipped", "price_list": "skipped", "selling_settings": "skipped", "fiscal_year": "skipped"}

# Selling Price List (required for Quotation / Sales Order / Sales Invoice)
# Create "Standard Selling" if no selling+enabled price list exists, then
# set Selling Settings.selling_price_list to point at it.
existing_pl = frappe.get_all(
    "Price List",
    filters={"selling": 1, "enabled": 1},
    fields=["name"],
    limit=1,
)
if existing_pl:
    selling_pl_name = existing_pl[0].get("name")
    result["price_list"] = f"exists: {selling_pl_name}"
else:
    selling_pl_name = "Standard Selling"
    if not frappe.db.exists("Price List", selling_pl_name):
        tenant_currency = frappe.db.get_default("currency") or "INR"
        frappe.get_doc({
            "doctype": "Price List",
            "price_list_name": selling_pl_name,
            "selling": 1,
            "buying": 0,
            "enabled": 1,
            "currency": tenant_currency,
        }).insert(ignore_permissions=True)
        result["price_list"] = f"seeded: {selling_pl_name}"
    else:
        result["price_list"] = f"exists: {selling_pl_name}"

# Ensure Selling Settings has a default selling_price_list pointing at our list
try:
    selling_settings = frappe.get_single("Selling Settings")
    if not selling_settings.selling_price_list:
        selling_settings.selling_price_list = selling_pl_name
        selling_settings.save(ignore_permissions=True)
        result["selling_settings"] = f"set default: {selling_pl_name}"
    else:
        result["selling_settings"] = f"already set: {selling_settings.selling_price_list}"
except Exception as _ss_err:
    result["selling_settings"] = f"error: {_ss_err}"

# Fiscal Year (required to submit Sales Order / Invoice)
# Ensure today falls into an active fiscal year for the default company.
# Default to India-style FY: Apr 1 → Mar 31.
try:
    company = None
    try:
        gd = frappe.get_single("Global Defaults")
        company = getattr(gd, "default_company", None) or None
    except Exception:
        company = None
    if not company:
        company = frappe.db.get_default("company") or frappe.db.get_default("default_company")

    today = datetime.date.today()
    if today.month >= 4:
        start_year = today.year
        end_year = today.year + 1
    else:
        start_year = today.year - 1
        end_year = today.year

    fy_name = f"{start_year}-{end_year}"
    fy_start = datetime.date(start_year, 4, 1)
    fy_end = datetime.date(end_year, 3, 31)

    if not frappe.db.exists("Fiscal Year", fy_name):
        fy = frappe.get_doc({
            "doctype": "Fiscal Year",
            "year": fy_name,
            "year_start_date": fy_start,
            "year_end_date": fy_end,
            "disabled": 0,
        })
        if company:
            fy.append("companies", {"company": company})
        fy.insert(ignore_permissions=True)
        result["fiscal_year"] = f"seeded: {fy_name}"
    else:
        result["fiscal_year"] = f"exists: {fy_name}"

    # Mark enabled and ensure company link exists.
    fy = frappe.get_doc("Fiscal Year", fy_name)
    changed = False
    if int(getattr(fy, "disabled", 0) or 0) == 1:
        fy.disabled = 0
        changed = True
    if company:
        linked = any(getattr(c, "company", None) == company for c in (fy.companies or []))
        if not linked:
            fy.append("companies", {"company": company})
            changed = True
    if changed:
        fy.save(ignore_permissions=True)

    # Set Company default fiscal year if missing
    if company:
        try:
            comp = frappe.get_doc("Company", company)
            if not getattr(comp, "default_fiscal_year", None):
                comp.default_fiscal_year = fy_name
                comp.save(ignore_permissions=True)
        except Exception:
            pass
except Exception as _fy_err:
    result["fiscal_year"] = f"error: {_fy_err}"

# Territory tree (All Territories → India)
territory_root = frappe.get_all("Territory", filters={"parent_territory": ""}, fields=["name"], limit=1)
if not territory_root:
    if not frappe.db.exists("Territory", "All Territories"):
        frappe.get_doc({
            "doctype": "Territory",
            "territory_name": "All Territories",
            "is_group": 1,
        }).insert(ignore_permissions=True)
    if not frappe.db.exists("Territory", "India"):
        frappe.get_doc({
            "doctype": "Territory",
            "territory_name": "India",
            "parent_territory": "All Territories",
            "is_group": 0,
        }).insert(ignore_permissions=True)
    result["territory"] = "seeded"
else:
    result["territory"] = f"exists: {territory_root[0].get('name')}"

# Customer Group tree (All Customer Groups → Commercial / Individual / Retail)
cg_root_list = frappe.get_all("Customer Group", filters={"parent_customer_group": ""}, fields=["name"], limit=1)
if not cg_root_list:
    if not frappe.db.exists("Customer Group", "All Customer Groups"):
        frappe.get_doc({
            "doctype": "Customer Group",
            "customer_group_name": "All Customer Groups",
            "is_group": 1,
        }).insert(ignore_permissions=True)
    for cg_name in ["Commercial", "Individual", "Retail"]:
        if not frappe.db.exists("Customer Group", cg_name):
            frappe.get_doc({
                "doctype": "Customer Group",
                "customer_group_name": cg_name,
                "parent_customer_group": "All Customer Groups",
                "is_group": 0,
            }).insert(ignore_permissions=True)
    result["customer_group"] = "seeded"
else:
    result["customer_group"] = f"exists: {cg_root_list[0].get('name')}"

# Item Group tree (All Item Groups → leaf groups for equipment rental)
ig_leaves = frappe.get_all("Item Group", filters={"is_group": 0}, fields=["name"], limit=1)
if not ig_leaves:
    # Ensure root group exists
    ig_roots = frappe.get_all("Item Group", filters={"is_group": 1}, fields=["name"], limit=1)
    root_group = ig_roots[0].get("name") if ig_roots else "All Item Groups"
    if not ig_roots:
        frappe.get_doc({
            "doctype": "Item Group",
            "item_group_name": "All Item Groups",
            "is_group": 1,
        }).insert(ignore_permissions=True)
        root_group = "All Item Groups"

    leaf_groups = [
        "Heavy Equipment Rental",
        "Construction Services",
        "Consulting",
        "Crane",
        "Service",
        "Spare Parts",
        "Equipment",
        "Consumables",
    ]
    created_groups = []
    for group_name in leaf_groups:
        if not frappe.db.exists("Item Group", group_name):
            frappe.get_doc({
                "doctype": "Item Group",
                "item_group_name": group_name,
                "parent_item_group": root_group,
                "is_group": 0,
            }).insert(ignore_permissions=True)
            created_groups.append(group_name)
    result["item_groups"] = f"seeded: {created_groups}" if created_groups else "seeded (all already existed)"
else:
    result["item_groups"] = f"exists: {len(ig_leaves)}+ groups"

# Opportunity Types (for CRM)
opp_types = ["Sales", "Rental", "Maintenance", "Service"]
created_opp = []
for opp_name in opp_types:
    if not frappe.db.exists("Opportunity Type", opp_name):
        frappe.get_doc({
            "doctype": "Opportunity Type",
            "name": opp_name,
        }).insert(ignore_permissions=True)
        created_opp.append(opp_name)
result["opportunity_types"] = f"seeded: {created_opp}" if created_opp else "all exist"

# Sales Stages (for CRM)
sales_stages = ["Prospecting", "Qualification", "Needs Analysis", "Proposal", "Negotiation", "Won", "Lost"]
created_stages = []
for stage_name in sales_stages:
    if not frappe.db.exists("Sales Stage", stage_name):
        frappe.get_doc({
            "doctype": "Sales Stage",
            "stage_name": stage_name,
        }).insert(ignore_permissions=True)
        created_stages.append(stage_name)
result["sales_stages"] = f"seeded: {created_stages}" if created_stages else "all exist"

# Standard UOMs (Unit of Measure)
uoms = ["Nos", "Unit", "Kg", "M", "Hr", "Day", "Month", "Hour"]
created_uoms = []
for uom_name in uoms:
    if not frappe.db.exists("UOM", uom_name):
        frappe.get_doc({
            "doctype": "UOM",
            "uom_name": uom_name,
            "must_be_whole_number": 1 if uom_name in ("Nos", "Unit") else 0
        }).insert(ignore_permissions=True)
        created_uoms.append(uom_name)
result["uoms"] = f"seeded: {created_uoms}" if created_uoms else "all exist"


# Fix DocPerms for dropdowns so standard users can read them
docperms_fixed = []
read_doctypes = ["Item Group", "Brand", "Opportunity Type", "Sales Stage", "Designation", "UOM", "Manufacturer"]
for dt in read_doctypes:
    if not frappe.db.exists("DocPerm", {"parent": dt, "role": "All", "permlevel": 0}):
        try:
            doc = frappe.new_doc("DocPerm")
            doc.parent = dt
            doc.parenttype = "DocType"
            doc.parentfield = "permissions"
            doc.role = "All"
            doc.permlevel = 0
            doc.read = 1
            doc.insert(ignore_permissions=True)
            docperms_fixed.append(dt)
        except Exception:
            pass
result["docperms"] = f"fixed read access: {docperms_fixed}" if docperms_fixed else "all ok"

# Self-heal existing System Managers by guaranteeing they have all domain manager roles
sm_users = frappe.get_all("Has Role", filters={"role": "System Manager", "parenttype": "User"}, fields=["parent"])
healed_users = []
domain_roles = ["Sales Manager", "Accounts Manager", "Projects Manager", "Stock Manager", "Employee"]
for ur in sm_users:
    user_email = ur.get("parent")
    if user_email and user_email != "Administrator":
        user_doc = frappe.get_doc("User", user_email)
        current_roles = [r.role for r in user_doc.roles]
        added = False
        for r in domain_roles:
            if r not in current_roles:
                user_doc.append("roles", {"role": r, "doctype": "Has Role"})
                added = True
        if added:
            user_doc.save(ignore_permissions=True)
            healed_users.append(user_email)
if healed_users:
    result["healed_users"] = healed_users

frappe.db.commit()

# Refresh cached doctype meta / user role caches so the DocPerm read-access
# fixes and self-healed roles above take effect on live web workers instead
# of being masked by the stale cached permission matrix.
for dt in docperms_fixed:
    frappe.clear_cache(doctype=dt)
for u in healed_users:
    frappe.clear_cache(user=u)
if docperms_fixed or healed_users:
    frappe.clear_cache()

print(json.dumps(result))
"""

    try:
        output = run_frappe_code(site_name, seed_code)
        seed_result = _parse_json_output(output)
        logger.info(f"seed-defaults for {site_name}: {seed_result}")
        return {"success": True, "site": site_name, "result": seed_result}
    except Exception as e:
        logger.error(f"seed-defaults failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/seed-custom-fields/{subdomain}")
async def seed_tenant_custom_fields(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """
    Ensure required Custom Fields exist on tenant DocTypes (idempotent).
    This is the production-safe way to guarantee the web app's custom_* fields
    are actually persisted (Frappe silently drops unknown fields on insert/save).
    """
    import re

    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    site_name = get_site_name(subdomain)

    custom_fields_code = """import json

result = {"created": [], "skipped": [], "errors": []}

# Rental fields used by Nexus ERP frontend.
# These MUST exist on the tenant site or rental data will be dropped on insert.
TARGET_DOCTYPES = ["Quotation Item", "Sales Order Item", "Sales Invoice Item"]

FIELD_SPECS = [
  # Rental flags + schedule
  {"fieldname": "custom_is_rental", "label": "Is Rental", "fieldtype": "Check", "insert_after": "description"},
  {"fieldname": "custom_rental_type", "label": "Rental Type", "fieldtype": "Select", "options": "Hours\\nDays\\nMonths", "insert_after": "custom_is_rental"},
  {"fieldname": "custom_rental_duration", "label": "Rental Duration", "fieldtype": "Int", "insert_after": "custom_rental_type"},
  {"fieldname": "custom_rental_start_date", "label": "Rental Start Date", "fieldtype": "Date", "insert_after": "custom_rental_duration"},
  {"fieldname": "custom_rental_end_date", "label": "Rental End Date", "fieldtype": "Date", "insert_after": "custom_rental_start_date"},
  {"fieldname": "custom_rental_start_time", "label": "Rental Start Time", "fieldtype": "Time", "insert_after": "custom_rental_end_date"},
  {"fieldname": "custom_rental_end_time", "label": "Rental End Time", "fieldtype": "Time", "insert_after": "custom_rental_start_time"},

  # Operator
  {"fieldname": "custom_requires_operator", "label": "Requires Operator", "fieldtype": "Check", "insert_after": "custom_rental_end_time"},
  {"fieldname": "custom_operator_included", "label": "Operator Included", "fieldtype": "Check", "insert_after": "custom_requires_operator"},
  {"fieldname": "custom_operator_name", "label": "Operator Name", "fieldtype": "Data", "insert_after": "custom_operator_included"},

  # Pricing components (Currency so ERPNext formats correctly)
  {"fieldname": "custom_base_rental_cost", "label": "Base Rental Cost", "fieldtype": "Currency", "insert_after": "custom_operator_name"},
  {"fieldname": "custom_accommodation_charges", "label": "Accommodation Charges", "fieldtype": "Currency", "insert_after": "custom_base_rental_cost"},
  {"fieldname": "custom_usage_charges", "label": "Usage Charges", "fieldtype": "Currency", "insert_after": "custom_accommodation_charges"},
  {"fieldname": "custom_fuel_charges", "label": "Fuel Charges", "fieldtype": "Currency", "insert_after": "custom_usage_charges"},
  {"fieldname": "custom_elongation_charges", "label": "Elongation Charges", "fieldtype": "Currency", "insert_after": "custom_fuel_charges"},
  {"fieldname": "custom_risk_charges", "label": "Risk Charges", "fieldtype": "Currency", "insert_after": "custom_elongation_charges"},
  {"fieldname": "custom_commercial_charges", "label": "Commercial Charges", "fieldtype": "Currency", "insert_after": "custom_risk_charges"},
  {"fieldname": "custom_incidental_charges", "label": "Incidental Charges", "fieldtype": "Currency", "insert_after": "custom_commercial_charges"},
  {"fieldname": "custom_other_charges", "label": "Other Charges", "fieldtype": "Currency", "insert_after": "custom_incidental_charges"},
  {"fieldname": "custom_total_rental_cost", "label": "Total Rental Cost", "fieldtype": "Currency", "insert_after": "custom_other_charges"},

  # Debug/support payload (JSON string)
  {"fieldname": "custom_rental_data", "label": "Rental Data", "fieldtype": "Long Text", "insert_after": "custom_total_rental_cost"},
]

def upsert_custom_field(dt: str, spec: dict):
    try:
        existing = frappe.db.exists("Custom Field", {"dt": dt, "fieldname": spec["fieldname"]})
        if existing:
            result["skipped"].append(f"{dt}:{spec['fieldname']}")
            return

        doc = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": dt,
            "fieldname": spec["fieldname"],
            "label": spec.get("label") or spec["fieldname"],
            "fieldtype": spec.get("fieldtype") or "Data",
            "insert_after": spec.get("insert_after") or "description",
            "options": spec.get("options") or None,
            "reqd": 0,
            "read_only": 0,
            "no_copy": 0,
            "print_hide": 0,
        })
        doc.insert(ignore_permissions=True)
        result["created"].append(f"{dt}:{spec['fieldname']}")
    except Exception as exc:
        result["errors"].append(f"{dt}:{spec.get('fieldname')}: {exc}")

for dt in TARGET_DOCTYPES:
    for spec in FIELD_SPECS:
        upsert_custom_field(dt, spec)

frappe.db.commit()
print(json.dumps(result))
"""

    try:
        output = run_frappe_code(site_name, custom_fields_code)
        parsed = _parse_json_output(output)
        logger.info(f"seed-custom-fields for {site_name}: {parsed}")
        return {"success": True, "site": site_name, "result": parsed}
    except Exception as e:
        logger.error(f"seed-custom-fields failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/seed-agent-doctypes/{subdomain}")
async def seed_tenant_agent_doctypes(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """
    Import Agent Action Log and Agent Audit Log on an existing tenant (idempotent).
    Repairs tenants provisioned before agentic-ai doctypes were part of provisioning.
    """
    import re

    if not re.match(r"^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$", subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    site_name = get_site_name(subdomain)

    try:
        parsed = seed_agent_doctypes_on_site(site_name)
        logger.info(f"seed-agent-doctypes for {site_name}: {parsed}")
        return {"success": True, "site": site_name, "result": parsed}
    except Exception as e:
        logger.error(f"seed-agent-doctypes failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/seed-docperms/{subdomain}")
async def seed_tenant_docperms(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """
    Ensure the minimum DocPerm matrix is present on an existing tenant.
    This is used to repair tenants provisioned before certain modules (e.g. Inspections)
    were added, or when ERPNext app updates introduce new doctypes.
    Idempotent — safe to call multiple times.
    """
    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"

    try:
        docperm_code = f"""
import json

matrix = {json.dumps(DOC_PERM_MINIMUM)}
updated = []
errors = []

def upsert(row):
    try:
        filters = {{
            "parent": row["doctype"],
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": row["role"],
            "permlevel": 0,
        }}
        name = frappe.db.exists("DocPerm", filters)
        doc = frappe.get_doc("DocPerm", name) if name else frappe.new_doc("DocPerm")
        doc.parent = row["doctype"]
        doc.parenttype = "DocType"
        doc.parentfield = "permissions"
        doc.role = row["role"]
        doc.permlevel = 0
        doc.read = int(row.get("read", 0))
        doc.write = int(row.get("write", 0))
        doc.create = int(row.get("create", 0))
        doc.delete = int(row.get("delete", 0))
        doc.submit = int(row.get("submit", 0))
        doc.cancel = int(row.get("cancel", 0))
        doc.amend = int(row.get("amend", 0))
        if name:
            doc.save(ignore_permissions=True)
        else:
            doc.insert(ignore_permissions=True)
        updated.append(f'{{row["doctype"]}}:{{row["role"]}}')
    except Exception as e:
        errors.append(f'{{row.get("doctype")}}:{{row.get("role")}}: {{e}}')

for row in matrix:
    upsert(row)

frappe.db.commit()

# CRITICAL: DocPerm rows are served from cached doctype meta held by the
# running web workers. Committing new rows from this out-of-process script
# does NOT refresh that cache, so workers keep evaluating against the stale
# (often empty) permission matrix and return 403 "does not have doctype
# access via role permission" indefinitely. Clear the cache so the new
# permissions take effect immediately on the live site.
cleared = set()
for row in matrix:
    dt = row.get("doctype")
    if dt and dt not in cleared:
        try:
            frappe.clear_cache(doctype=dt)
            cleared.add(dt)
        except Exception as e:
            errors.append(f'clear_cache:{{dt}}: {{e}}')
frappe.clear_cache()

print(json.dumps({{"updated": updated, "count": len(updated), "errors": errors}}))
"""

        parsed = _parse_json_output(run_frappe_code(site_name, docperm_code))
        logger.info(f"seed-docperms for {site_name}: {parsed}")
        return {"success": True, "site": site_name, "result": parsed}
    except Exception as e:
        logger.error(f"seed-docperms failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/v1/employees/{subdomain}")
async def list_employees(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """
    List active Employee records on a tenant site.
    Uses ignore_permissions=True — no Frappe role required on the caller side.
    """
    import re
    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    site_name = get_site_name(subdomain)

    list_code = """import json
employees = frappe.get_all(
    "Employee",
    filters={"status": "Active"},
    fields=["name", "employee_name", "status", "date_of_joining",
            "cell_number", "bio", "date_of_birth", "creation"],
    order_by="creation desc",
    limit=500,
    ignore_permissions=True,
)
print(json.dumps(employees, default=str))
"""

    try:
        output = run_frappe_code(site_name, list_code)
        employees = _parse_json_output_list(output)
        return {"success": True, "site": site_name, "employees": employees}
    except Exception as e:
        logger.error(f"list-employees failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/create-employee/{subdomain}")
async def create_employee(subdomain: str, request: Request, _auth: bool = Depends(verify_api_secret)):
    """
    Create an Employee record on a tenant site with ignore_permissions.
    Body: { first_name, last_name?, email?, cell_number?, date_of_birth,
            gender?, date_of_joining?, bio?, status? }
    """
    import re
    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    payload = await request.json()
    site_name = get_site_name(subdomain)
    safe_payload = json.dumps(payload)

    create_code = f"""import json
import datetime

data = json.loads({json.dumps(safe_payload)})

first_name = (data.get("first_name") or "").strip()
last_name = (data.get("last_name") or "").strip()
if not first_name:
    raise ValueError("first_name is required")

date_of_birth = data.get("date_of_birth")
if not date_of_birth:
    raise ValueError("date_of_birth is required")

date_of_joining = data.get("date_of_joining") or str(datetime.date.today())

gender = (data.get("gender") or "").strip()
if not gender:
    raise ValueError("gender is required")

doc = {{
    "doctype": "Employee",
    "first_name": first_name,
    "last_name": last_name,
    "employee_name": f"{{first_name}} {{last_name}}".strip(),
    "date_of_birth": date_of_birth,
    "date_of_joining": date_of_joining,
    "gender": gender,
    "status": data.get("status") or "Active",
    "cell_number": data.get("cell_number") or "",
}}

if data.get("personal_email") or data.get("email"):
    doc["personal_email"] = data.get("personal_email") or data.get("email")
if data.get("bio"):
    doc["bio"] = data.get("bio")

employee = frappe.get_doc(doc)
employee.insert(ignore_permissions=True)
frappe.db.commit()

print(json.dumps({{
    "name": employee.name,
    "employee_name": employee.employee_name,
    "status": employee.status,
    "date_of_joining": str(employee.date_of_joining or ""),
    "date_of_birth": str(employee.date_of_birth or ""),
    "cell_number": employee.cell_number or "",
    "bio": employee.bio or "",
}}))
"""

    try:
        output = run_frappe_code(site_name, create_code)
        created = _parse_json_output(output)
        if not created or created.get("error"):
            raise HTTPException(status_code=422, detail=created.get("error", "Employee creation failed"))
        return {"success": True, "site": site_name, "employee": created}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create-employee failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/v1/update-employee/{subdomain}/{employee_id}")
async def update_employee(
    subdomain: str,
    employee_id: str,
    request: Request,
    _auth: bool = Depends(verify_api_secret),
):
    """
    Update an Employee record on a tenant site with ignore_permissions.
    employee_id is the Frappe document name (e.g. "EMP-0001").
    Body: any subset of Employee fields to update.
    """
    import re
    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    payload = await request.json()
    site_name = get_site_name(subdomain)
    safe_payload = json.dumps(payload)
    safe_id = json.dumps(employee_id)

    update_code = f"""import json

data = json.loads({json.dumps(safe_payload)})
employee_id = {safe_id}

employee = frappe.get_doc("Employee", employee_id)

for field in ["first_name", "last_name", "date_of_birth", "date_of_joining",
              "cell_number", "bio", "status"]:
    if field in data and data[field] is not None:
        setattr(employee, field, data[field])

if "personal_email" in data or "email" in data:
    employee.personal_email = data.get("personal_email") or data.get("email")

if "first_name" in data or "last_name" in data:
    first = employee.first_name or ""
    last = employee.last_name or ""
    employee.employee_name = f"{{first}} {{last}}".strip()

employee.save(ignore_permissions=True)
frappe.db.commit()

print(json.dumps({{
    "name": employee.name,
    "employee_name": employee.employee_name,
    "status": employee.status,
}}))
"""

    try:
        output = run_frappe_code(site_name, update_code)
        updated = _parse_json_output(output)
        if not updated or updated.get("error"):
            raise HTTPException(status_code=422, detail=updated.get("error", "Employee update failed"))
        return {"success": True, "site": site_name, "employee": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update-employee failed for {site_name}/{employee_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/delete-employee/{subdomain}/{employee_id}")
async def delete_employee(
    subdomain: str,
    employee_id: str,
    _auth: bool = Depends(verify_api_secret),
):
    """
    Soft-delete (deactivate) an Employee record on a tenant site.
    Sets status to Inactive to preserve audit trail.
    """
    import re
    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    site_name = get_site_name(subdomain)
    safe_id = json.dumps(employee_id)

    delete_code = f"""import json
employee_id = {safe_id}
employee = frappe.get_doc("Employee", employee_id)
employee.status = "Inactive"
employee.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({{"name": employee_id, "status": "Inactive"}}))
"""

    try:
        output = run_frappe_code(site_name, delete_code)
        result = _parse_json_output(output)
        return {"success": True, "site": site_name, "result": result}
    except Exception as e:
        logger.error(f"delete-employee failed for {site_name}/{employee_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/items/{subdomain}")
async def list_items(
    subdomain: str,
    q: str | None = None,
    item_group: str | None = None,
    limit: int = 500,
    _auth: bool = Depends(verify_api_secret),
):
    """
    List Items on a tenant site using ignore_permissions=True.
    Query params:
      - q: optional search term (matches item_code or item_name)
      - item_group: optional exact Item Group filter
      - limit: max rows (default 500)
    """
    import re
    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    site_name = get_site_name(subdomain)
    safe_q = json.dumps((q or "").strip())
    safe_group = json.dumps((item_group or "").strip())
    safe_limit = int(limit) if isinstance(limit, int) else 500
    if safe_limit <= 0:
        safe_limit = 500
    if safe_limit > 2000:
        safe_limit = 2000

    list_code = f"""import json

q = {safe_q}
item_group = {safe_group}
limit = {safe_limit}

filters = {{"disabled": 0}}
if item_group:
    filters["item_group"] = item_group

or_filters = None
if q:
    or_filters = [
        ["Item", "item_code", "like", f"%{{q}}%"],
        ["Item", "item_name", "like", f"%{{q}}%"],
    ]

items = frappe.get_all(
    "Item",
    filters=filters,
    or_filters=or_filters,
    fields=["item_code", "item_name", "description", "item_group", "standard_rate", "is_stock_item"],
    order_by="item_group asc, item_code asc",
    limit=limit,
    ignore_permissions=True,
)

print(json.dumps(items, default=str))
"""

    try:
        output = run_frappe_code(site_name, list_code)
        items = _parse_json_output_list(output)
        return {"success": True, "site": site_name, "items": items}
    except Exception as e:
        logger.error(f"list-items failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/catalog-defaults/{subdomain}")
async def get_catalog_defaults(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """
    Return tenant-valid Item Group and UOM defaults from ERPNext.
    Uses bench execute context, so it bypasses regular API role visibility issues.
    """
    import re

    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"

    defaults_code = """import json

preferred_groups = [
    "Heavy Equipment Rental",
    "Equipment",
    "Service",
]
preferred_uoms = ["Nos", "Unit"]

item_groups = frappe.get_all(
    "Item Group",
    filters={"is_group": 0},
    fields=["name"],
    order_by="name asc",
    limit=200,
)
uoms = frappe.get_all(
    "UOM",
    fields=["name"],
    order_by="name asc",
    limit=200,
)

group_names = [g.get("name") for g in item_groups if g.get("name")]
uom_names = [u.get("name") for u in uoms if u.get("name")]

resolved_group = None
for name in preferred_groups:
    if name in group_names:
        resolved_group = name
        break
if not resolved_group and group_names:
    resolved_group = group_names[0]

resolved_uom = None
for name in preferred_uoms:
    if name in uom_names:
        resolved_uom = name
        break
if not resolved_uom and uom_names:
    resolved_uom = uom_names[0]

print(json.dumps({
    "item_group": resolved_group,
    "stock_uom": resolved_uom,
    "item_groups": group_names,
    "uoms": uom_names,
}))
"""

    try:
        output = run_frappe_code(site_name, defaults_code)
        defaults = _parse_json_output(output)
        return {"success": True, "site": site_name, "defaults": defaults}
    except Exception as e:
        logger.error(f"catalog-defaults failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@app.post("/api/v1/generate-user-keys/{subdomain}")
async def generate_user_api_keys(subdomain: str, request: Request, _auth: bool = Depends(verify_api_secret)):
    """
    Generate API key + secret for any user on a tenant site.
    Uses ignore_permissions=True (via run_frappe_code) — no System Manager required.
    Protected by X-Provisioning-Secret header (verified by verify_api_secret dependency).
    """
    # NEW: validate subdomain against safe slug pattern
    import re
    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    body = await request.json()
    user_email = body.get("user_email", "").strip()
    force_rotate = bool(body.get("force_rotate"))
    if not user_email or "@" not in user_email:
        raise HTTPException(status_code=400, detail="user_email is required and must be a valid email")

    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"
    logger.info(f"generate-user-keys: site={site_name} user={user_email[:3]}***")

    cache_key = f"{site_name}:{user_email}"
    if cache_key not in _generate_keys_locks:
        _generate_keys_locks[cache_key] = asyncio.Lock()

    async with _generate_keys_locks[cache_key]:
        cached = _GENERATED_USER_KEYS_CACHE.get(cache_key)
        if cached:
            cached_key, cached_secret, cached_at = cached
            if time.time() - cached_at < _GENERATED_USER_KEYS_TTL_SEC:
                if _validate_user_api_token(site_name, user_email, cached_key, cached_secret):
                    logger.info(f"generate-user-keys: returning cached keys for {user_email} on {site_name}")
                    return {"success": True, "api_key": cached_key, "api_secret": cached_secret}
                _GENERATED_USER_KEYS_CACHE.pop(cache_key, None)

        # Read existing keys first — only rotate when missing or invalid (avoids
        # invalidating browser cookies on every login/refresh).
        safe_email = json.dumps(user_email)
        read_code = f"""import json
import frappe
from frappe.utils.password import get_decrypted_password

user_email = {safe_email}
try:
    user = frappe.get_doc("User", user_email)
    api_key = user.api_key
    api_secret_val = get_decrypted_password("User", user_email, "api_secret", raise_exception=False)
    if not api_key or not api_secret_val:
        print(json.dumps({{"missing": True}}))
    else:
        print(json.dumps({{"api_key": api_key, "api_secret": api_secret_val}}))
except Exception as exc:
    print(json.dumps({{"error": str(exc)}}))
"""
        rotate_code = f"""import json
import frappe
from frappe.core.doctype.user.user import generate_keys
from frappe.utils.password import get_decrypted_password

user_email = {safe_email}
try:
    _gen = generate_keys(user_email)
    # Frappe versions differ: older returns the api_secret as a bare string,
    # newer returns a dict like {{"api_secret": "..."}}. Normalize to the string
    # or every comparison below silently fails (dict != str -> valid=False).
    if isinstance(_gen, dict):
        api_secret_val = _gen.get("api_secret") or _gen.get("apiSecret")
    else:
        api_secret_val = _gen
    user = frappe.get_doc("User", user_email)
    user.reload()
    frappe.db.commit()
    api_key = user.api_key
    decrypt_error = None
    try:
        stored = get_decrypted_password("User", user_email, "api_secret", raise_exception=False)
    except Exception as de:
        stored = None
        decrypt_error = str(de)
    valid = bool(api_key and stored and api_secret_val == stored)
    enc_key = frappe.local.conf.get("encryption_key")
    print(json.dumps({{
        "api_key": api_key,
        "api_secret": api_secret_val,
        "valid": valid,
        "diag": {{
            "api_key_present": bool(api_key),
            "secret_present": bool(api_secret_val),
            "stored_present": bool(stored),
            "match": bool(stored) and api_secret_val == stored,
            "decrypt_error": decrypt_error,
            "encryption_key_present": bool(enc_key),
            "encryption_key_len": len(enc_key) if enc_key else 0,
        }},
    }}))
except Exception as exc:
    print(json.dumps({{"error": str(exc)}}))
"""

        def _accept_keys(api_key_val: str, api_secret_val: str, action: str) -> dict:
            _GENERATED_USER_KEYS_CACHE[cache_key] = (api_key_val, api_secret_val, time.time())
            logger.info(f"generate-user-keys: {action} keys for {user_email} on {site_name}")
            return {"success": True, "api_key": api_key_val, "api_secret": api_secret_val}

        def _return_validated_keys(
            api_key_val: str,
            api_secret_val: str,
            *,
            rotated: bool,
            prevalidated: bool = False,
        ) -> dict:
            action = "rotated" if rotated else "returned existing"
            # When prevalidated=True the rotate script's inline bench check already
            # confirmed match(api_secret_val, stored) == True — trust it directly.
            # For the read path (prevalidated=False) do a bench round-trip to confirm
            # the stored secret is still consistent.
            # NOTE: the provisioning container cannot reach Frappe over HTTP (the
            # FRAPPE_INTERNAL_URL 127.0.0.1:8080 is the host port, not reachable
            # inside the container, and the external URL may not route correctly
            # from within Docker). The Next.js app performs its own HTTP validation
            # via verifyTenantApiToken after receiving these keys — that is the
            # correct final gate.
            if prevalidated or _validate_user_api_token(site_name, user_email, api_key_val, api_secret_val):
                return _accept_keys(api_key_val, api_secret_val, action)
            raise HTTPException(
                status_code=502,
                detail=f"API keys failed validation for {user_email} on {site_name}",
            )

        try:
            if force_rotate:
                _GENERATED_USER_KEYS_CACHE.pop(cache_key, None)
                output = run_frappe_code(site_name, rotate_code)
                result = _parse_json_output(output)
                if not result or result.get("error"):
                    detail = result.get("error") if result else "no output"
                    raise HTTPException(status_code=502, detail=f"Could not rotate keys: {detail}")
                api_key_val = result.get("api_key")
                api_secret_val = result.get("api_secret")
                if not api_key_val or not api_secret_val:
                    raise HTTPException(status_code=502, detail="Rotate did not return api_key/api_secret")
                if not result.get("valid"):
                    logger.error(
                        f"generate-user-keys: inline validation failed for {user_email} on {site_name} "
                        f"(forced rotate). diag={result.get('diag')}"
                    )
                    raise HTTPException(
                        status_code=502,
                        detail=f"Rotated keys failed inline validation for {user_email} on {site_name}",
                    )
                return _return_validated_keys(
                    api_key_val, api_secret_val, rotated=True, prevalidated=True
                )

            output = run_frappe_code(site_name, read_code)
            result = _parse_json_output(output)
            if not result:
                raise HTTPException(
                    status_code=502,
                    detail="Frappe produced no parseable JSON when reading user API keys",
                )
            if result.get("error"):
                raise HTTPException(status_code=404, detail=f"Could not read keys: {result['error']}")

            api_key_val = result.get("api_key")
            api_secret_val = result.get("api_secret")
            if api_key_val and api_secret_val and not result.get("missing"):
                try:
                    return _return_validated_keys(api_key_val, api_secret_val, rotated=False)
                except HTTPException:
                    logger.warning(
                        f"generate-user-keys: existing keys invalid for {user_email} on {site_name}; rotating"
                    )

            output = run_frappe_code(site_name, rotate_code)
            result = _parse_json_output(output)
            if not result:
                logger.error(
                    f"generate-user-keys: unparseable Frappe output for {user_email} on {site_name}. "
                    f"Raw output (first 500 chars): {output[:500]!r}"
                )
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Frappe produced no parseable JSON output. "
                        "Check provisioning service logs for script stdout/stderr."
                    ),
                )
            if result.get("error"):
                raise HTTPException(status_code=404, detail=f"Could not generate keys: {result['error']}")
            api_key_val = result.get("api_key")
            api_secret_val = result.get("api_secret")
            if not api_key_val or not api_secret_val:
                raise HTTPException(
                    status_code=502,
                    detail="Frappe did not return api_key/api_secret in output",
                )
            if not result.get("valid"):
                logger.error(
                    f"generate-user-keys: inline validation failed for {user_email} on {site_name}. "
                    f"diag={result.get('diag')}"
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Rotated keys failed inline validation for {user_email} on {site_name}",
                )
            return _return_validated_keys(
                api_key_val, api_secret_val, rotated=True, prevalidated=True
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"generate-user-keys failed for {site_name}: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/create-item/{subdomain}")
async def create_item_with_defaults(subdomain: str, request: Request, _auth: bool = Depends(verify_api_secret)):
    """
    Create Item with ignore_permissions, resolving valid Item Group and UOM in tenant context.
    """
    import re

    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$', subdomain):
        raise HTTPException(status_code=400, detail="Invalid subdomain format")

    payload = await request.json()
    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"
    safe_payload = json.dumps(payload)

    create_code = f"""import json

data = json.loads({json.dumps(safe_payload)})

preferred_groups = [
    "Heavy Equipment Rental",
    "Equipment",
    "Service",
]
preferred_uoms = ["Nos", "Unit"]

item_groups = frappe.get_all(
    "Item Group",
    filters={{"is_group": 0}},
    fields=["name"],
    order_by="name asc",
    limit=200,
)
uoms = frappe.get_all(
    "UOM",
    fields=["name"],
    order_by="name asc",
    limit=200,
)

group_names = [g.get("name") for g in item_groups if g.get("name")]
uom_names = [u.get("name") for u in uoms if u.get("name")]

requested_group = (data.get("item_group") or "").strip()
requested_uom = (data.get("stock_uom") or "").strip()

resolved_group = requested_group if requested_group in group_names else None
if not resolved_group:
    for name in preferred_groups:
        if name in group_names:
            resolved_group = name
            break
if not resolved_group and group_names:
    resolved_group = group_names[0]

resolved_uom = requested_uom if requested_uom in uom_names else None
if not resolved_uom:
    for name in preferred_uoms:
        if name in uom_names:
            resolved_uom = name
            break
if not resolved_uom and uom_names:
    resolved_uom = uom_names[0]

if not resolved_group:
    raise Exception("No Item Group found in tenant")
if not resolved_uom:
    raise Exception("No UOM found in tenant")

doc = {{
    "doctype": "Item",
    "item_code": data.get("item_code"),
    "item_name": data.get("item_name"),
    "item_group": resolved_group,
    "description": data.get("description") or "",
    "standard_rate": float(data.get("standard_rate") or 0),
    "is_stock_item": 1 if str(data.get("is_stock_item")) in ["1", "true", "True"] else 0,
    "stock_uom": resolved_uom,
}}

if data.get("brand"):
    doc["brand"] = data.get("brand")
if data.get("manufacturer"):
    doc["manufacturer"] = data.get("manufacturer")
if data.get("opening_stock") not in [None, ""]:
    doc["opening_stock"] = float(data.get("opening_stock"))
if data.get("reorder_level") not in [None, ""]:
    doc["reorder_level"] = float(data.get("reorder_level"))

item = frappe.get_doc(doc)
item.insert(ignore_permissions=True)
frappe.db.commit()

print(json.dumps({{
    "name": item.name,
    "item_group": resolved_group,
    "stock_uom": resolved_uom,
}}))
"""

    try:
        output = run_frappe_code(site_name, create_code)
        created = _parse_json_output(output)
        return {"success": True, "site": site_name, "item": created}
    except Exception as e:
        logger.error(f"create-item failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    try:
        output = run_frappe_code(site_name, gen_code)
        result = _parse_json_output(output)
        if result.get("error"):
            raise HTTPException(status_code=404, detail=f"Could not generate keys: {result['error']}")
        logger.info(f"generate-user-keys: keys generated for {user_email} on {site_name}")
        return {"success": True, "api_key": result["api_key"], "api_secret": result["api_secret"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate-user-keys failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/assign-user-roles/{subdomain}")
async def assign_user_roles(subdomain: str, request: Request, _auth: bool = Depends(verify_api_secret)):
    """
    Replace a user's roles on a tenant site.
    Body: { "user_email": "...", "roles": ["Sales Manager", "Sales User"] }
    Uses ignore_permissions=True so the Next.js app doesn't need System Manager.
    """
    body = await request.json()
    user_email = body.get("user_email", "").strip()
    roles = body.get("roles", [])
    if not user_email or not roles:
        raise HTTPException(status_code=400, detail="user_email and roles are required")

    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"

    safe_email = json.dumps(user_email)
    safe_roles = json.dumps(roles)
    role_code = f"""import json
import frappe

user_email = {safe_email}
desired_roles = {safe_roles}

try:
    user = frappe.get_doc("User", user_email)
    # Remove role profile so it doesn't override explicit roles
    user.role_profile_name = None

    # Clear existing roles (keep 'All' which Frappe requires)
    user.roles = []
    for role_name in desired_roles:
        if frappe.db.exists("Role", role_name):
            user.append("roles", {{"role": role_name, "doctype": "Has Role"}})

    user.save(ignore_permissions=True)
    frappe.db.commit()
    # Clear the user's cached role set so live requests authenticated via an
    # existing session cookie pick up the new roles immediately instead of
    # looping on stale 403s.
    frappe.clear_cache(user=user_email)
    # Also drop any active sessions: session data caches the role set at login,
    # so an already-logged-in user would otherwise keep the stale roles until
    # re-login. Clearing forces the next request to rebuild from the freshly
    # committed Has Role rows.
    try:
        frappe.sessions.clear_sessions(user=user_email)
        frappe.db.commit()
    except Exception:
        pass
    assigned = [r.role for r in user.roles]
    print(json.dumps({{"assigned": assigned}}))
except Exception as exc:
    print(json.dumps({{"error": str(exc)}}))
"""

    try:
        output = run_frappe_code(site_name, role_code)
        result = _parse_json_output(output)
        if result.get("error"):
            raise HTTPException(status_code=404, detail=f"Could not assign roles: {result['error']}")
        logger.info(f"assign-user-roles: {result.get('assigned')} for {user_email} on {site_name}")
        return {"success": True, "assigned": result.get("assigned", [])}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"assign-user-roles failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/get-user-roles/{subdomain}")
async def get_user_roles(subdomain: str, request: Request, _auth: bool = Depends(verify_api_secret)):
    """
    Fetch a user's roles from a tenant site using ignore_permissions.
    Body: { "user_email": "..." }
    Returns: { "success": true, "roles": [...], "role_profile_name": "..." | null }
    """
    body = await request.json()
    user_email = body.get("user_email", "").strip()
    if not user_email:
        raise HTTPException(status_code=400, detail="user_email is required")

    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"

    safe_email = json.dumps(user_email)
    role_code = f"""import json
import frappe

user_email = {safe_email}
try:
    user = frappe.get_doc("User", user_email)
    roles = [r.role for r in user.roles if r.role != "All"]
    profile = user.role_profile_name
    print(json.dumps({{"roles": roles, "role_profile_name": profile}}))
except Exception as exc:
    print(json.dumps({{"error": str(exc)}}))
"""

    try:
        output = run_frappe_code(site_name, role_code)
        result = _parse_json_output(output)
        if result.get("error"):
            raise HTTPException(status_code=404, detail=f"Could not fetch roles: {result['error']}")
        logger.info(f"get-user-roles: {result.get('roles')} for {user_email} on {site_name}")
        return {"success": True, "roles": result.get("roles", []), "role_profile_name": result.get("role_profile_name")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get-user-roles failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/create-tenant-user/{subdomain}")
async def create_tenant_user(
    subdomain: str,
    payload: TenantUserCreateRequest,
    _auth: bool = Depends(verify_api_secret),
):
    """Create a tenant user using invite-type mapping or direct role assignment."""
    site_name = get_site_name(subdomain)

    primary_role = None
    if payload.invite_type:
        primary_role = INVITE_TYPE_TO_ROLE.get(payload.invite_type.strip().lower())
        if not primary_role:
            raise HTTPException(status_code=400, detail="Invalid invite_type")
    elif payload.role:
        candidate = payload.role.strip()
        if candidate not in DIRECT_ASSIGNABLE_ROLES:
            raise HTTPException(status_code=400, detail="Invalid direct role assignment")
        primary_role = candidate
    else:
        raise HTTPException(status_code=400, detail="Either invite_type or role is required")

    desired_roles = [primary_role, "All"]

    if primary_role in MANAGER_ROLES:
        extra_mgrs = [r for r in desired_roles if r in MANAGER_ROLES and r != primary_role]
        if extra_mgrs:
            raise HTTPException(status_code=400, detail="Conflicting manager roles are not allowed")

    create_code = f"""import json
import frappe.utils
from frappe.utils.password import update_password

email = {json.dumps(str(payload.user_email))}
first_name = {json.dumps(payload.first_name.strip())}
last_name = {json.dumps((payload.last_name or "").strip())}
roles = {json.dumps(desired_roles)}

is_new_user = not frappe.db.exists("User", email)
if is_new_user:
    user = frappe.new_doc("User")
    user.email = email
else:
    user = frappe.get_doc("User", email)

user.first_name = first_name
user.last_name = last_name
user.enabled = 1
user.user_type = "System User"
user.send_welcome_email = 1
user.role_profile_name = None
user.roles = []
for role_name in roles:
    user.append("roles", {{"role": role_name, "doctype": "Has Role"}})
user.save(ignore_permissions=True)

initial_password = None
if is_new_user:
    initial_password = frappe.utils.random_string(12)
    update_password(email, initial_password, logout_all_sessions=0)

frappe.db.commit()
result = {{"roles": [r.role for r in user.roles], "is_new": is_new_user}}
if initial_password:
    result["initial_password"] = initial_password
print(json.dumps(result))
"""
    try:
        create_result = _parse_json_output(run_frappe_code(site_name, create_code))
        assigned = create_result.get("roles", [])
        if set(assigned) != set(desired_roles):
            strip_code = f"""import json
email = {json.dumps(str(payload.user_email))}
roles = {json.dumps(desired_roles)}
user = frappe.get_doc("User", email)
user.role_profile_name = None
user.roles = []
for role_name in roles:
    user.append("roles", {{"role": role_name, "doctype": "Has Role"}})
user.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({{"roles": [r.role for r in user.roles]}}))
"""
            create_result = _parse_json_output(run_frappe_code(site_name, strip_code))
            assigned = create_result.get("roles", [])

        if set(assigned) != set(desired_roles):
            raise HTTPException(
                status_code=500,
                detail=f"Role assignment mismatch. expected={desired_roles} got={assigned}",
            )

        response_payload: dict = {
            "success": True,
            "user_email": str(payload.user_email),
            "roles": assigned,
        }
        if create_result.get("initial_password"):
            response_payload["initial_password"] = create_result["initial_password"]
            response_payload["is_new"] = True
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create-tenant-user failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/change-tenant-user-role/{subdomain}")
async def change_tenant_user_role(
    subdomain: str,
    payload: TenantUserRoleChangeRequest,
    _auth: bool = Depends(verify_api_secret),
):
    """Replace a user's role set with [new_role, All] and clear sessions."""
    site_name = get_site_name(subdomain)
    new_role = payload.new_role.strip()
    allowed = set(REQUIRED_ERP_ROLES)
    if new_role not in allowed:
        raise HTTPException(status_code=400, detail="Invalid role")

    if new_role in MANAGER_ROLES:
        # Single-role payload enforced by design; this preserves no-conflict rule.
        desired_roles = [new_role, "All"]
    else:
        desired_roles = [new_role, "All"]

    role_change_code = f"""import json
email = {json.dumps(str(payload.user_email))}
roles = {json.dumps(desired_roles)}
user = frappe.get_doc("User", email)
user.role_profile_name = None
user.roles = []
for role_name in roles:
    user.append("roles", {{"role": role_name, "doctype": "Has Role"}})
user.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({{"roles": [r.role for r in user.roles]}}))
"""
    try:
        update_result = _parse_json_output(run_frappe_code(site_name, role_change_code))
        assigned = update_result.get("roles", [])
        if set(assigned) != set(desired_roles):
            raise HTTPException(
                status_code=500,
                detail=f"Role update mismatch. expected={desired_roles} got={assigned}",
            )

        clear_session_code = f"""import json
email = {json.dumps(str(payload.user_email))}
frappe.sessions.clear_sessions(user=email)
frappe.db.commit()
print(json.dumps({{"cleared": True}}))
"""
        _parse_json_output(run_frappe_code(site_name, clear_session_code))

        return {"success": True, "user_email": str(payload.user_email), "roles": assigned}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"change-tenant-user-role failed for {site_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/deprovision/{subdomain}")
async def deprovision_tenant(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """Remove a tenant site (destructive — for cleanup/testing)."""
    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"

    try:
        run_bench_command([
            "drop-site", site_name,
            "--db-root-password", DB_ROOT_PASSWORD,
            "--force",
        ], timeout=60)

        try:
            run_frappe_code(MASTER_SITE, f"""
if frappe.db.exists("SaaS Tenant", "{subdomain}"):
    frappe.delete_doc("SaaS Tenant", "{subdomain}", ignore_permissions=True)
    frappe.db.commit()
print("deleted")
""")
        except Exception:
            pass

        return {"success": True, "message": f"Site {site_name} removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Internal Helpers
# ============================================================================

def _parse_json_output(output: str) -> dict:
    """Parse JSON from the last line of Frappe script output."""
    for line in reversed(output.strip().splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue

    logger.warning(f"Could not parse JSON from output: {output[:300]}")
    return {}


def _parse_json_output_list(output: str) -> list:
    """Parse a JSON array from the last line of Frappe script output."""
    for line in reversed(output.strip().splitlines()):
        line = line.strip()
        if line.startswith("[") and line.endswith("]"):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue

    logger.warning(f"Could not parse JSON list from output: {output[:300]}")
    return []


def _cleanup_failed_site(site_name: str):
    """Best-effort cleanup of a partially created site."""
    logger.warning(f"Attempting cleanup of failed site: {site_name}")
    try:
        run_bench_command([
            "drop-site", site_name,
            "--db-root-password", DB_ROOT_PASSWORD,
            "--force",
        ], timeout=60)
        logger.info(f"Cleanup successful: {site_name}")
    except Exception as e:
        logger.error(f"Cleanup failed for {site_name}: {e}")


# ============================================================================
# Entrypoint
# ============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PROVISIONING_PORT", "8001"))
    logger.info(f"Starting Provisioning Service v2.0 on port {port}")
    logger.info(f"  Backend container: {BACKEND_CONTAINER}")
    logger.info(f"  Bench path: {BENCH_PATH}")
    logger.info(f"  Master site: {MASTER_SITE}")
    logger.info(f"  Parent domain: {PARENT_DOMAIN}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
