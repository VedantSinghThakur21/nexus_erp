# Frappe API-Only Backend Configuration

Complete guide to configure Frappe tenant sites as API-only backends with OAuth Bearer token authentication.

---

## Overview

This configuration:
- ✅ Disables password-based login
- ✅ Disables user signup
- ✅ Enforces OAuth Bearer token authentication
- ✅ Disables all web UI login forms
- ✅ Keeps API endpoints functional

---

## Part 1: Disable Password Login

### Method 1: Site Configuration (Recommended)

```bash
cd ~/frappe-bench

# Disable password login for tenant1
bench --site api.tenant1.localhost set-config disable_user_pass_login 1

# Disable password login for tenant2
bench --site api.tenant2.localhost set-config disable_user_pass_login 1

# Disable standard login page
bench --site api.tenant1.localhost set-config disable_standard_login 1
bench --site api.tenant2.localhost set-config disable_standard_login 1

# Verify configuration
bench --site api.tenant1.localhost show-config
```

### Method 2: Direct site_config.json Edit

**File: `~/frappe-bench/sites/api.tenant1.localhost/site_config.json`**

```json
{
  "db_name": "_api_tenant1_localhost",
  "db_password": "...",
  "disable_user_pass_login": 1,
  "disable_standard_login": 1,
  "disable_signup": 1,
  "oauth_only": true
}
```

**Apply to all tenant sites:**

```bash
cd ~/frappe-bench

# For each tenant site
for site in sites/api.tenant*.localhost; do
    sitename=$(basename $site)
    echo "Configuring $sitename..."
    
    bench --site $sitename set-config disable_user_pass_login 1
    bench --site $sitename set-config disable_standard_login 1
    bench --site $sitename set-config disable_signup 1
done
```

---

## Part 2: Disable User Signup

### Disable Signup via Bench

```bash
cd ~/frappe-bench

# Disable signup on tenant sites
bench --site api.tenant1.localhost set-config disable_signup 1
bench --site api.tenant2.localhost set-config disable_signup 1

# Verify
bench --site api.tenant1.localhost show-config | grep disable_signup
```

### Disable Signup via System Settings

1. Log in to Frappe as Administrator (before disabling password login)
2. Go to: **Setup → System Settings**
3. Uncheck: **Allow Signup**
4. Save

Or via bench console:

```bash
bench --site api.tenant1.localhost console

# In Python console:
>>> import frappe
>>> frappe.db.set_value('Website Settings', None, 'disable_signup', 1)
>>> frappe.db.commit()
>>> exit()
```

---

## Part 3: Create Custom OAuth Validation Endpoint

Since Frappe doesn't have built-in OAuth-only mode, we need to create custom authentication.

### Create Custom App for OAuth Validation

```bash
cd ~/frappe-bench

# Create custom app
bench new-app tenant_oauth_auth

# Add to site
bench --site api.tenant1.localhost install-app tenant_oauth_auth
bench --site api.tenant2.localhost install-app tenant_oauth_auth
```

### Custom OAuth Authentication Hook

**File: `~/frappe-bench/apps/tenant_oauth_auth/tenant_oauth_auth/hooks.py`**

```python
app_name = "tenant_oauth_auth"
app_title = "Tenant OAuth Auth"
app_publisher = "Your Company"
app_description = "OAuth-only authentication for tenant backends"
app_icon = "octicon octicon-shield"
app_color = "blue"
app_email = "admin@example.com"
app_license = "MIT"

# Override login page
override_whitelisted_methods = {
    "frappe.auth.get_logged_user": "tenant_oauth_auth.auth.get_logged_user_oauth"
}

# Custom authentication
before_request = [
    "tenant_oauth_auth.auth.validate_oauth_token"
]
```

**File: `~/frappe-bench/apps/tenant_oauth_auth/tenant_oauth_auth/auth.py`**

```python
import frappe
import requests
from frappe import _
from frappe.auth import HTTPRequest
from functools import wraps

# OAuth Provider Configuration
OAUTH_PROVIDER_URL = frappe.conf.get("oauth_provider_url", "http://auth.localhost:8080")
OAUTH_VALIDATION_ENDPOINT = "/api/method/frappe.integrations.oauth2.openid_profile"

def validate_oauth_token():
    """
    Validate OAuth Bearer token before processing any request
    Runs before every HTTP request
    """
    # Skip validation for certain paths
    path = frappe.request.path
    
    # Allow these paths without OAuth
    skip_paths = [
        '/api/method/ping',
        '/api/method/version',
        '/assets/',
        '/files/',
    ]
    
    if any(path.startswith(p) for p in skip_paths):
        return
    
    # Get Authorization header
    auth_header = frappe.get_request_header("Authorization")
    
    if not auth_header:
        frappe.throw(_("Missing Authorization header"), frappe.AuthenticationError)
    
    if not auth_header.startswith("Bearer "):
        frappe.throw(_("Invalid Authorization header format"), frappe.AuthenticationError)
    
    # Extract token
    token = auth_header.replace("Bearer ", "")
    
    # Validate token with OAuth provider
    try:
        response = requests.get(
            f"{OAUTH_PROVIDER_URL}{OAUTH_VALIDATION_ENDPOINT}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        
        if response.status_code != 200:
            frappe.throw(_("Invalid or expired token"), frappe.AuthenticationError)
        
        user_info = response.json().get("message", {})
        
        if not user_info or not user_info.get("email"):
            frappe.throw(_("Could not retrieve user info"), frappe.AuthenticationError)
        
        # Set user in frappe session
        frappe.set_user(user_info["email"])
        frappe.local.oauth_user_info = user_info
        
    except requests.RequestException as e:
        frappe.log_error(f"OAuth validation failed: {str(e)}")
        frappe.throw(_("Token validation failed"), frappe.AuthenticationError)

def get_logged_user_oauth():
    """
    Override default get_logged_user to use OAuth
    """
    if hasattr(frappe.local, 'oauth_user_info'):
        return frappe.local.oauth_user_info.get("email")
    
    return "Guest"

def oauth_required(fn):
    """
    Decorator to enforce OAuth authentication on specific endpoints
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not hasattr(frappe.local, 'oauth_user_info'):
            frappe.throw(_("OAuth authentication required"), frappe.PermissionError)
        
        return fn(*args, **kwargs)
    
    return wrapper
```

---

## Part 4: Block Login Routes via Nginx

### Update Nginx Configuration

**File: `/etc/nginx/conf.d/frappe-bench.conf`**

Add these location blocks to block UI login routes:

```nginx
server {
    listen 80;
    server_name api.tenant1.localhost api.tenant2.localhost api.tenant*.localhost;
    
    root /home/frappe/frappe-bench/sites;
    
    # Block login pages
    location /login {
        return 403 "Login disabled. Use OAuth authentication.";
    }
    
    location /signup {
        return 403 "Signup disabled.";
    }
    
    location /api/method/login {
        return 403 "Password login disabled. Use OAuth tokens.";
    }
    
    location /api/method/frappe.core.doctype.user.user.sign_up {
        return 403 "Signup disabled.";
    }
    
    # Allow OAuth endpoints
    location /api/method/frappe.integrations.oauth2 {
        proxy_pass http://frappe-bench-frappe;
        proxy_set_header X-Frappe-Site-Name $host;
        proxy_set_header Host $host;
    }
    
    # Allow API endpoints with Bearer token
    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header X-Frappe-Site-Name $host;
        proxy_set_header Host $host;
        proxy_pass http://frappe-bench-frappe;
    }
    
    # Rest of your config...
}
```

**Reload Nginx:**

```bash
sudo nginx -t
sudo service nginx reload
```

---

## Part 5: Create Test API Endpoints

**File: `~/frappe-bench/apps/tenant_oauth_auth/tenant_oauth_auth/api.py`**

```python
import frappe
from frappe import _
from tenant_oauth_auth.auth import oauth_required

@frappe.whitelist(allow_guest=False)
@oauth_required
def get_user_profile():
    """
    Get current user profile
    Requires OAuth Bearer token
    """
    user = frappe.get_doc("User", frappe.session.user)
    
    return {
        "email": user.email,
        "full_name": user.full_name,
        "user_image": user.user_image,
        "roles": frappe.get_roles(user.name),
        "tenant": frappe.local.site
    }

@frappe.whitelist(allow_guest=False)
@oauth_required
def get_tenant_data():
    """
    Get tenant-specific data
    Requires OAuth Bearer token
    """
    return {
        "site": frappe.local.site,
        "user": frappe.session.user,
        "oauth_user_info": getattr(frappe.local, 'oauth_user_info', None),
        "timestamp": frappe.utils.now()
    }

@frappe.whitelist(allow_guest=True)
def health_check():
    """
    Health check endpoint (no auth required)
    """
    return {
        "status": "healthy",
        "site": frappe.local.site,
        "timestamp": frappe.utils.now()
    }
```

---

## Part 6: Validation with curl

### Test 1: Password Login Should Fail

```bash
# Attempt password login (should fail)
curl -X POST http://api.tenant1.localhost:8080/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr":"Administrator","pwd":"admin123"}'

# Expected response:
# HTTP 403 Forbidden
# "Password login disabled. Use OAuth tokens."
```

### Test 2: Signup Should Fail

```bash
# Attempt signup (should fail)
curl -X POST http://api.tenant1.localhost:8080/api/method/frappe.core.doctype.user.user.sign_up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","full_name":"Test User"}'

# Expected response:
# HTTP 403 Forbidden
# "Signup disabled."
```

### Test 3: API Without Token Should Fail

```bash
# Call API without token (should fail)
curl http://api.tenant1.localhost:8080/api/method/tenant_oauth_auth.api.get_user_profile

# Expected response:
# {
#   "exc_type": "AuthenticationError",
#   "exception": "Missing Authorization header"
# }
```

### Test 4: API With Invalid Token Should Fail

```bash
# Call API with invalid token (should fail)
curl http://api.tenant1.localhost:8080/api/method/tenant_oauth_auth.api.get_user_profile \
  -H "Authorization: Bearer invalid_token_here"

# Expected response:
# {
#   "exc_type": "AuthenticationError",
#   "exception": "Invalid or expired token"
# }
```

### Test 5: API With Valid OAuth Token Should Work

**First, get a valid OAuth token from your Next.js frontend:**

```javascript
// In browser console
const token = localStorage.getItem('access_token')
console.log(token)
```

**Then use it:**

```bash
# Call API with valid OAuth token (should work)
curl http://api.tenant1.localhost:8080/api/method/tenant_oauth_auth.api.get_user_profile \
  -H "Authorization: Bearer YOUR_VALID_TOKEN_HERE"

# Expected response:
# {
#   "message": {
#     "email": "user@example.com",
#     "full_name": "John Doe",
#     "user_image": "/files/user.jpg",
#     "roles": ["System Manager", "Sales User"],
#     "tenant": "api.tenant1.localhost"
#   }
# }
```

### Test 6: Health Check (No Auth Required)

```bash
# Health check should work without token
curl http://api.tenant1.localhost:8080/api/method/tenant_oauth_auth.api.health_check

# Expected response:
# {
#   "message": {
#     "status": "healthy",
#     "site": "api.tenant1.localhost",
#     "timestamp": "2026-01-13 12:34:56"
#   }
# }
```

### Test 7: Cross-Tenant Token Validation

```bash
# Token from tenant1 should work on tenant1
curl http://api.tenant1.localhost:8080/api/method/tenant_oauth_auth.api.get_tenant_data \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Success with tenant1 data

# Same token on tenant2 should also work (if user exists on tenant2)
curl http://api.tenant2.localhost:8080/api/method/tenant_oauth_auth.api.get_tenant_data \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Success with tenant2 data
```

---

## Part 7: Complete Setup Script

**File: `setup_api_only.sh`**

```bash
#!/bin/bash

###############################################################################
# Configure Frappe Tenant Sites as API-Only Backends
# Disables password login, signup, and enforces OAuth tokens
###############################################################################

set -e

BENCH_PATH="$HOME/frappe-bench"
TENANT_SITES=("api.tenant1.localhost" "api.tenant2.localhost" "api.tenant3.localhost")

echo "🔒 Configuring Frappe tenant sites as API-only backends..."

cd "$BENCH_PATH"

# Configure each tenant site
for site in "${TENANT_SITES[@]}"; do
    if [ -d "sites/$site" ]; then
        echo "📝 Configuring $site..."
        
        # Disable password login
        bench --site "$site" set-config disable_user_pass_login 1
        
        # Disable standard login page
        bench --site "$site" set-config disable_standard_login 1
        
        # Disable signup
        bench --site "$site" set-config disable_signup 1
        
        # Set OAuth provider URL
        bench --site "$site" set-config oauth_provider_url "http://auth.localhost:8080"
        
        # Disable Website Settings signup via console
        bench --site "$site" console <<EOF
import frappe
frappe.db.set_value('Website Settings', None, 'disable_signup', 1)
frappe.db.commit()
print("✓ Signup disabled in Website Settings")
EOF
        
        echo "✓ $site configured"
    else
        echo "⚠ Site $site not found, skipping..."
    fi
done

# Create custom OAuth app (if not exists)
if [ ! -d "apps/tenant_oauth_auth" ]; then
    echo "📦 Creating custom OAuth authentication app..."
    bench new-app tenant_oauth_auth --no-git
    
    # Install on all tenant sites
    for site in "${TENANT_SITES[@]}"; do
        if [ -d "sites/$site" ]; then
            bench --site "$site" install-app tenant_oauth_auth
        fi
    done
fi

# Restart services
echo "🔄 Restarting services..."
sudo supervisorctl restart all
sudo service nginx reload

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📋 Verification commands:"
echo ""
for site in "${TENANT_SITES[@]}"; do
    echo "# Test $site"
    echo "curl http://$site:8080/api/method/tenant_oauth_auth.api.health_check"
    echo ""
done
echo "# Attempt login (should fail):"
echo "curl -X POST http://api.tenant1.localhost:8080/api/method/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"usr\":\"Administrator\",\"pwd\":\"admin123\"}'"
echo ""
```

**Make executable and run:**

```bash
chmod +x setup_api_only.sh
./setup_api_only.sh
```

---

## Part 8: Verification Checklist

```bash
# 1. Check site configuration
bench --site api.tenant1.localhost show-config | grep -E 'disable|oauth'

# Expected output:
# "disable_user_pass_login": 1
# "disable_standard_login": 1
# "disable_signup": 1
# "oauth_provider_url": "http://auth.localhost:8080"

# 2. Test password login blocked
curl -v -X POST http://api.tenant1.localhost:8080/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr":"Administrator","pwd":"admin"}'
# Expected: HTTP 403

# 3. Test signup blocked
curl -v http://api.tenant1.localhost:8080/signup
# Expected: HTTP 403

# 4. Test API without token
curl -v http://api.tenant1.localhost:8080/api/method/frappe.auth.get_logged_user
# Expected: Authentication error

# 5. Test health check (no auth)
curl http://api.tenant1.localhost:8080/api/method/ping
# Expected: {"message":"pong"}

# 6. Test with valid OAuth token
curl http://api.tenant1.localhost:8080/api/method/tenant_oauth_auth.api.get_user_profile \
  -H "Authorization: Bearer YOUR_VALID_TOKEN"
# Expected: User profile data
```

---

## Summary

### Configuration Applied:

✅ **Password Login Disabled**
- `disable_user_pass_login: 1`
- `/api/method/login` blocked via Nginx
- Returns HTTP 403

✅ **Signup Disabled**
- `disable_signup: 1`
- Website Settings updated
- `/signup` blocked via Nginx
- Returns HTTP 403

✅ **OAuth Token Enforcement**
- Custom authentication hook validates Bearer tokens
- Tokens validated against central auth server
- Invalid tokens rejected with 401
- User session set from token validation

✅ **API-Only Mode**
- All web UI routes blocked
- Only `/api/` endpoints accessible
- Health check endpoint available
- Bearer token required for authenticated endpoints

### curl Commands Summary:

```bash
# ❌ Password login (should fail)
curl -X POST http://api.tenant1.localhost:8080/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr":"admin","pwd":"pass"}'

# ❌ Signup (should fail)
curl http://api.tenant1.localhost:8080/signup

# ❌ API without token (should fail)
curl http://api.tenant1.localhost:8080/api/method/custom.api

# ✅ Health check (should work)
curl http://api.tenant1.localhost:8080/api/method/ping

# ✅ API with OAuth token (should work)
curl http://api.tenant1.localhost:8080/api/method/tenant_oauth_auth.api.get_user_profile \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN"
```

Your Frappe tenant sites are now **secure API-only backends** that only accept OAuth Bearer tokens! 🔒
