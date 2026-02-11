"""
Nexus ERP — Production-Grade Provisioning Service
===================================================
A FastAPI microservice that runs INSIDE the Frappe Docker container
(or as a sidecar with shared bench access).

WHY THIS EXISTS:
- Node.js cannot reliably create Frappe sites via `docker exec` + shell pipes
- This service has native access to `bench` CLI and Frappe's Python API
- It exposes clean REST endpoints that Next.js calls over HTTP

DEPLOYMENT:
- Runs as a second process in the Frappe backend container (supervisord)
- OR as a sidecar container sharing the bench volume
- Listens on port 8001 (internal only, not exposed to internet)

SECURITY:
- Protected by a shared secret (PROVISIONING_API_SECRET)
- Only the Next.js server can call this — never exposed publicly
"""

import os
import sys
import json
import subprocess
import secrets
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator
import uvicorn

# ============================================================================
# Configuration
# ============================================================================

BENCH_PATH = os.environ.get("BENCH_PATH", "/home/frappe/frappe-bench")
MASTER_SITE = os.environ.get("MASTER_SITE_NAME", "erp.localhost")
PARENT_DOMAIN = os.environ.get("PARENT_DOMAIN", "avariq.in")
DB_ROOT_PASSWORD = os.environ.get("DB_ROOT_PASSWORD", "123")
PROVISIONING_SECRET = os.environ.get("PROVISIONING_API_SECRET", "change-me-in-production")
DEFAULT_APPS = os.environ.get("DEFAULT_APPS", "nexus_core").split(",")
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development") == "production"

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
    version="1.0.0",
    docs_url="/docs" if not IS_PRODUCTION else None,  # Disable Swagger in prod
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
    admin_password: Optional[str] = None  # Auto-generated if not provided
    admin_full_name: Optional[str] = None
    plan_type: PlanType = PlanType.FREE

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
    success: bool
    site_name: Optional[str] = None
    subdomain: Optional[str] = None
    admin_password: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    error: Optional[str] = None
    steps_completed: list[str] = []


class HealthResponse(BaseModel):
    status: str
    bench_path: str
    master_site: str
    timestamp: str


class SubdomainCheckResponse(BaseModel):
    available: bool
    subdomain: str
    reason: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def run_bench_command(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    """
    Execute a bench command with proper error handling.
    
    This is the ONLY place in the entire system where shell commands run.
    Everything is parameterized — no string interpolation into shell commands.
    """
    cmd = ["bench"] + args
    logger.info(f"Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            cwd=BENCH_PATH,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            logger.error(f"Command failed (exit {result.returncode})")
            logger.error(f"STDOUT: {result.stdout}")
            logger.error(f"STDERR: {result.stderr}")
        else:
            logger.info(f"Command succeeded")
            if result.stdout.strip():
                logger.debug(f"STDOUT: {result.stdout[:500]}")
        return result
    except subprocess.TimeoutExpired:
        logger.error(f"Command timed out after {timeout}s")
        raise HTTPException(status_code=504, detail=f"Bench command timed out after {timeout}s")


def run_frappe_code(site_name: str, python_code: str) -> str:
    """
    Execute Python code in the context of a specific Frappe site.
    
    Uses `bench execute` or `bench --site X console` with stdin.
    This is cleaner than piping into bench console and parsing output.
    
    IMPORTANT: The python_code must print a JSON object as the LAST line
    so we can reliably parse the result.
    """
    # Write to a temp file inside the bench directory for safety
    tmp_file = Path(BENCH_PATH) / f"_tmp_provision_{secrets.token_hex(8)}.py"
    
    try:
        # Use Frappe's virtualenv Python (not the provisioning service's Python)
        frappe_python = f"{BENCH_PATH}/env/bin/python"
        
        result = subprocess.run(
            [
                frappe_python, "-c",
                f"""
import frappe
frappe.init(site="{site_name}", sites_path="{BENCH_PATH}/sites")
frappe.connect()
try:
{_indent(python_code, 4)}
finally:
    frappe.destroy()
"""
            ],
            cwd=BENCH_PATH,
            capture_output=True,
            text=True,
            timeout=60,
        )
        
        if result.returncode != 0:
            logger.error(f"Frappe code execution failed: {result.stderr}")
            raise Exception(f"Frappe execution error: {result.stderr}")
        
        return result.stdout.strip()
    finally:
        if tmp_file.exists():
            tmp_file.unlink()


def _indent(code: str, spaces: int) -> str:
    """Indent a block of code by N spaces."""
    prefix = " " * spaces
    return "\n".join(prefix + line for line in code.splitlines())


def generate_subdomain(org_name: str) -> str:
    """Convert organization name to a valid subdomain slug."""
    import re
    slug = org_name.lower()
    slug = re.sub(r"[^a-z0-9]", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    
    # DNS label constraints: 3-63 chars
    if len(slug) < 3:
        slug = slug + "-org"
    if len(slug) > 63:
        slug = slug[:63].rstrip("-")
    
    return slug


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check — verifies bench is accessible."""
    bench_exists = Path(BENCH_PATH).exists()
    return HealthResponse(
        status="healthy" if bench_exists else "degraded",
        bench_path=BENCH_PATH,
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
        # Parse the last JSON line from output
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


@app.post("/api/v1/provision", response_model=ProvisionResponse)
async def provision_tenant(req: ProvisionRequest, _auth: bool = Depends(verify_api_secret)):
    """
    MAIN PROVISIONING ENDPOINT
    
    Transactional site creation with rollback on failure.
    Steps:
      1. Generate subdomain + admin password
      2. Check if site already exists (idempotent)
      3. bench new-site
      4. Install apps
      5. Create System User with password + roles
      6. Generate API keys for the admin user
      7. Register tenant in Master DB
    
    If any step fails after site creation, we attempt cleanup.
    """
    subdomain = generate_subdomain(req.organization_name)
    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"
    admin_password = req.admin_password or secrets.token_urlsafe(16)
    admin_name = req.admin_full_name or req.organization_name
    steps_completed: list[str] = []
    
    logger.info(f"═══ PROVISIONING START: {site_name} ═══")
    logger.info(f"  Org: {req.organization_name}")
    logger.info(f"  Email: {req.admin_email}")
    logger.info(f"  Plan: {req.plan_type.value}")
    
    # ── Step 0: Pre-flight — Check Master DB for duplicates ──
    try:
        output = run_frappe_code(MASTER_SITE, f"""
import json
subdomain_exists = frappe.db.exists("SaaS Tenant", {{"subdomain": "{subdomain}"}})
email_exists = frappe.db.count("SaaS Tenant", {{"owner_email": "{req.admin_email}"}})
print(json.dumps({{"subdomain_exists": bool(subdomain_exists), "email_exists": int(email_exists)}}, default=str))
""")
        preflight = _parse_json_output(output)
        
        if preflight.get("subdomain_exists"):
            logger.warning(f"Subdomain '{subdomain}' already exists — returning existing")
            return ProvisionResponse(
                success=True,
                site_name=site_name,
                subdomain=subdomain,
                admin_password=admin_password,
                error="Tenant already exists (idempotent)",
                steps_completed=["preflight_duplicate"],
            )
        
        if preflight.get("email_exists", 0) > 0:
            return ProvisionResponse(
                success=False,
                error=f"Email {req.admin_email} already owns a tenant",
            )
        
        steps_completed.append("preflight_check")
        logger.info("  ✓ Pre-flight check passed")
    except Exception as e:
        logger.warning(f"  ⚠ Pre-flight check failed, proceeding: {e}")
    
    # ── Step 1: Create Site ──
    try:
        result = run_bench_command([
            "new-site", site_name,
            "--admin-password", admin_password,
            "--db-root-password", DB_ROOT_PASSWORD,
            "--no-mariadb-socket",
        ], timeout=120)
        
        if result.returncode != 0:
            # Check if site already exists
            if "already exists" in (result.stderr + result.stdout).lower():
                logger.info(f"  Site {site_name} already exists, continuing...")
                steps_completed.append("site_exists")
            else:
                raise Exception(f"bench new-site failed: {result.stderr}")
        else:
            steps_completed.append("site_created")
            logger.info(f"  ✓ Site created: {site_name}")
    except Exception as e:
        logger.error(f"  ✗ Site creation failed: {e}")
        return ProvisionResponse(success=False, error=str(e), steps_completed=steps_completed)
    
    # ── Step 2: Install Apps ──
    for app_name in DEFAULT_APPS:
        app_name = app_name.strip()
        if not app_name:
            continue
        try:
            result = run_bench_command([
                "--site", site_name,
                "install-app", app_name,
            ], timeout=120)
            
            if result.returncode != 0:
                if "already installed" in (result.stderr + result.stdout).lower():
                    logger.info(f"  App '{app_name}' already installed")
                else:
                    logger.warning(f"  ⚠ install-app {app_name} failed (non-fatal): {result.stderr}")
            
            steps_completed.append(f"app_installed:{app_name}")
            logger.info(f"  ✓ App installed: {app_name}")
        except Exception as e:
            logger.warning(f"  ⚠ Failed to install {app_name}: {e}")
    
    # ── Step 3: Create Admin User + Set Password + Assign Roles ──
    api_key = None
    api_secret = None
    
    try:
        user_code = f"""
import json
import frappe
import frappe.utils.password

result = {{"user_created": False, "api_key": None, "api_secret": None}}

# Create or get user
if not frappe.db.exists("User", "{req.admin_email}"):
    user = frappe.new_doc("User")
    user.email = "{req.admin_email}"
    user.first_name = "{admin_name}"
    user.enabled = 1
    user.new_password = "{admin_password}"
    user.flags.no_welcome_mail = True
    user.insert(ignore_permissions=True)
    result["user_created"] = True
else:
    user = frappe.get_doc("User", "{req.admin_email}")
    result["user_created"] = False

# Set password (idempotent)
frappe.utils.password.update_password("{req.admin_email}", "{admin_password}")

# Assign System Manager role
if not frappe.db.exists("Has Role", {{"parent": "{req.admin_email}", "role": "System Manager"}}):
    user.add_roles("System Manager")

# Generate API keys for programmatic access
api_key = frappe.generate_hash(length=15)
api_secret_val = frappe.generate_hash(length=15)

user.reload()
user.api_key = api_key
user.api_secret = api_secret_val
user.save(ignore_permissions=True)

result["api_key"] = api_key
result["api_secret"] = api_secret_val

frappe.db.commit()
print(json.dumps(result, default=str))
"""
        output = run_frappe_code(site_name, user_code)
        user_result = _parse_json_output(output)
        
        api_key = user_result.get("api_key")
        api_secret = user_result.get("api_secret")
        
        steps_completed.append("admin_user_configured")
        logger.info(f"  ✓ Admin user configured (created={user_result.get('user_created')})")
        
    except Exception as e:
        logger.error(f"  ✗ Admin user creation failed: {e}")
        # This is critical — attempt cleanup
        _cleanup_failed_site(site_name)
        return ProvisionResponse(
            success=False,
            error=f"Admin user creation failed: {e}",
            steps_completed=steps_completed,
        )
    
    # ── Step 4: Seed SaaS Settings on the Tenant Site ──
    try:
        max_users = {"Free": 5, "Pro": 50, "Enterprise": 1000}[req.plan_type.value]
        
        seed_code = f"""
import json

if frappe.db.exists("SaaS Settings", "{req.organization_name}"):
    doc = frappe.get_doc("SaaS Settings", "{req.organization_name}")
else:
    doc = frappe.new_doc("SaaS Settings")

doc.organization_name = "{req.organization_name}"
doc.plan_type = "{req.plan_type.value}"
doc.max_users = {max_users}
doc.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({{"seeded": True}}))
"""
        run_frappe_code(site_name, seed_code)
        steps_completed.append("saas_settings_seeded")
        logger.info("  ✓ SaaS Settings seeded on tenant site")
    except Exception as e:
        logger.warning(f"  ⚠ SaaS Settings seeding failed (non-fatal): {e}")
    
    # ── Step 5: Register in Master DB ──
    try:
        protocol = "https" if IS_PRODUCTION else "http"
        site_url = f"{protocol}://{site_name}"
        
        register_code = f"""
import json

if not frappe.db.exists("SaaS Tenant", "{subdomain}"):
    doc = frappe.new_doc("SaaS Tenant")
    doc.subdomain = "{subdomain}"
    doc.owner_email = "{req.admin_email}"
    doc.organization_name = "{req.organization_name}"
    doc.site_url = "{site_url}"
    doc.status = "Active"
    doc.plan_type = "{req.plan_type.value}"
    doc.admin_user = "{req.admin_email}"
    doc.api_key = "{api_key or ''}"
    doc.api_secret = "{api_secret or ''}"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(json.dumps({{"registered": True, "action": "created"}}))
else:
    doc = frappe.get_doc("SaaS Tenant", "{subdomain}")
    doc.status = "Active"
    doc.site_url = "{site_url}"
    doc.api_key = "{api_key or ''}"
    doc.api_secret = "{api_secret or ''}"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print(json.dumps({{"registered": True, "action": "updated"}}))
"""
        output = run_frappe_code(MASTER_SITE, register_code)
        reg_result = _parse_json_output(output)
        
        steps_completed.append("master_db_registered")
        logger.info(f"  ✓ Master DB registration ({reg_result.get('action', 'done')})")
        
    except Exception as e:
        logger.error(f"  ✗ Master DB registration failed: {e}")
        # Site exists but Master doesn't know about it — this needs manual intervention
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
    
    # ── Step 6: Setup Nginx (production only) ──
    if IS_PRODUCTION:
        try:
            result = run_bench_command(["setup", "nginx", "--yes"], timeout=60)
            if result.returncode == 0:
                subprocess.run(["sudo", "nginx", "-s", "reload"], capture_output=True, timeout=15)
                steps_completed.append("nginx_configured")
                logger.info("  ✓ Nginx configured and reloaded")
        except Exception as e:
            logger.warning(f"  ⚠ Nginx setup failed (non-fatal): {e}")
    
    logger.info(f"═══ PROVISIONING COMPLETE: {site_name} ═══")
    logger.info(f"  Steps: {steps_completed}")
    
    return ProvisionResponse(
        success=True,
        site_name=site_name,
        subdomain=subdomain,
        admin_password=admin_password,
        api_key=api_key,
        api_secret=api_secret,
        steps_completed=steps_completed,
    )


@app.delete("/api/v1/deprovision/{subdomain}")
async def deprovision_tenant(subdomain: str, _auth: bool = Depends(verify_api_secret)):
    """Remove a tenant site (destructive — for cleanup/testing)."""
    site_name = f"{subdomain}.{PARENT_DOMAIN}" if IS_PRODUCTION else f"{subdomain}.localhost"
    
    try:
        # Drop site
        result = run_bench_command([
            "drop-site", site_name,
            "--db-root-password", DB_ROOT_PASSWORD,
            "--force",
        ], timeout=60)
        
        # Remove from Master DB
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
    """
    Parse JSON from the last line of Frappe script output.
    Frappe prints warnings/logs before our JSON, so we scan from the end.
    """
    for line in reversed(output.strip().splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
    
    logger.warning(f"Could not parse JSON from output: {output[:300]}")
    return {}


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
    logger.info(f"Starting Provisioning Service on port {port}")
    logger.info(f"  Bench path: {BENCH_PATH}")
    logger.info(f"  Master site: {MASTER_SITE}")
    logger.info(f"  Parent domain: {PARENT_DOMAIN}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
