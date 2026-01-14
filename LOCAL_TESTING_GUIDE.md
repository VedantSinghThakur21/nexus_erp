# Local Multi-Tenant SaaS Testing Guide

Complete testing guide for validating DNS-based multi-tenancy, OAuth authentication, and API isolation on localhost.

---

## Table of Contents

1. [Pre-Flight Checks](#pre-flight-checks)
2. [Tenant Routing Validation](#tenant-routing-validation)
3. [OAuth Login Testing](#oauth-login-testing)
4. [API Isolation Testing](#api-isolation-testing)
5. [Common Misconfigurations](#common-misconfigurations)
6. [Debug Tips](#debug-tips)

---

## Pre-Flight Checks

### 1. Verify Hosts File Configuration

**Windows: `C:\Windows\System32\drivers\etc\hosts`**
**Linux/Mac: `/etc/hosts`**

Required entries:

```
127.0.0.1    localhost
127.0.0.1    auth.localhost
127.0.0.1    tenant1.localhost
127.0.0.1    tenant2.localhost
127.0.0.1    api.auth.localhost
127.0.0.1    api.tenant1.localhost
127.0.0.1    api.tenant2.localhost
```

**Verification:**

```bash
# Windows
ping tenant1.localhost

# Linux/Mac
ping -c 3 tenant1.localhost

# Should resolve to 127.0.0.1
```

### 2. Verify Services Running

**Next.js Frontend:**

```powershell
# Check if Next.js is running on port 3000
netstat -ano | findstr :3000

# Or check with curl
curl http://localhost:3000
# Expected: HTML response or redirect
```

**Frappe Backend:**

```powershell
# Check if Frappe is running on port 8080
netstat -ano | findstr :8080

# Or check with curl
curl http://localhost:8080
# Expected: HTML or JSON response
```

**Start Services if Needed:**

```bash
# Start Next.js (Windows PowerShell)
cd "C:\Users\Vedant Singh Thakur\Downloads\nexus_erp"
npm run dev

# Start Frappe (SSH to VM or local)
cd ~/frappe-bench
bench start
```

### 3. Verify Environment Variables

```powershell
# Check Next.js environment
cd "C:\Users\Vedant Singh Thakur\Downloads\nexus_erp"
Get-Content .env.local

# Should contain:
# OAUTH_CLIENT_ID=...
# OAUTH_CLIENT_SECRET=...
# NEXT_PUBLIC_OAUTH_AUTH_URL=http://auth.localhost:8080
# NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://tenant1.localhost:3000/auth/callback
```

### 4. Verify Frappe Sites Created

**SSH to Frappe server (if remote):**

```bash
ssh frappe@103.224.243.242
cd ~/frappe-bench

# List all sites
bench --site all list-sites

# Expected output:
# auth.localhost
# api.tenant1.localhost
# api.tenant2.localhost

# Verify site status
bench --site api.tenant1.localhost list-apps
```

---

## Tenant Routing Validation

### Test 1: Frontend Routes to Correct Tenant

**Objective:** Verify middleware extracts tenant from hostname

**Browser Test:**

1. Open: `http://tenant1.localhost:3000`
2. Open DevTools → Network tab
3. Check request headers for any API call
4. **Expected:** `x-tenant: tenant1` header present

**curl Test:**

```bash
# Test tenant1
curl -v http://tenant1.localhost:3000 2>&1 | findstr "x-tenant"

# Expected in response headers:
# x-tenant: tenant1

# Test tenant2
curl -v http://tenant2.localhost:3000 2>&1 | findstr "x-tenant"

# Expected in response headers:
# x-tenant: tenant2
```

**Debug Tips:**

```bash
# If x-tenant header is missing:
# 1. Check middleware.ts is exporting 'config' with matcher
# 2. Verify middleware runs: console.log() in middleware.ts
# 3. Restart Next.js dev server

# Check middleware logs
npm run dev
# Look for console logs when accessing tenant1.localhost:3000
```

### Test 2: Backend URL Resolution

**Objective:** Verify frontend resolves correct backend URL per tenant

**Browser Test:**

1. Open: `http://tenant1.localhost:3000`
2. Open DevTools → Console
3. Run:

```javascript
// Test backend URL resolution
const hostname = window.location.hostname;
console.log('Current hostname:', hostname);

// Simulate getBackendURL logic
const parts = hostname.split('.');
const tenant = parts[0];
const apiHostname = ['api', tenant, ...parts.slice(1)].join('.');
const backendUrl = `http://${apiHostname}:8080`;

console.log('Expected backend URL:', backendUrl);
// Should be: http://api.tenant1.localhost:8080
```

**curl Test:**

```bash
# Direct backend access
curl http://api.tenant1.localhost:8080/api/method/ping

# Expected response:
# {"message":"pong"}

# Test tenant2
curl http://api.tenant2.localhost:8080/api/method/ping

# Expected response:
# {"message":"pong"}
```

**Debug Tips:**

```bash
# If backend not accessible:
# 1. Check Frappe bench is running: bench start
# 2. Check site exists: bench --site api.tenant1.localhost list-apps
# 3. Check Nginx/proxy configuration
# 4. Verify port 8080 is listening: netstat -ano | findstr :8080
```

### Test 3: Cross-Tenant Isolation

**Objective:** Verify tenant1 cannot access tenant2's backend

**curl Test:**

```bash
# Get token for tenant1 (from browser localStorage)
# Open http://tenant1.localhost:3000
# DevTools Console: localStorage.getItem('access_token')

# Try to use tenant1's token on tenant2's backend
curl http://api.tenant2.localhost:8080/api/method/frappe.auth.get_logged_user \
  -H "Authorization: Bearer TENANT1_TOKEN"

# Expected: 401 Unauthorized or user not found error
# (depending on OAuth validation implementation)
```

---

## OAuth Login Testing

### Test 4: OAuth Authorization Flow

**Objective:** Complete full OAuth login flow

**Browser Test Steps:**

1. **Initiate Login:**
   - Open: `http://tenant1.localhost:3000/auth/login`
   - Should show "Sign in with OAuth" button
   - Click button

2. **Redirect to Auth Provider:**
   - Should redirect to: `http://auth.localhost:8080/api/method/frappe.integrations.oauth2.authorize`
   - URL should contain parameters:
     - `client_id=your-client-id`
     - `redirect_uri=http://tenant1.localhost:3000/auth/callback`
     - `response_type=code`
     - `state=random-string`

3. **Auth Server Login:**
   - Login with Frappe credentials
   - Username: `Administrator`
   - Password: `admin` (or your configured password)
   - Should show "Authorize Application" screen

4. **Grant Permission:**
   - Click "Allow" or "Authorize"
   - Should redirect back to: `http://tenant1.localhost:3000/auth/callback?code=...&state=...`

5. **Callback Processing:**
   - Callback page should show loading spinner
   - Should make POST request to `/api/auth/token`
   - Should store tokens in localStorage
   - Should redirect to dashboard

6. **Verify Tokens Stored:**
   - Open DevTools → Console
   - Run:

```javascript
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));
console.log('Expires At:', localStorage.getItem('token_expires_at'));

// Verify expiration is in future
const expiresAt = parseInt(localStorage.getItem('token_expires_at'));
const now = Date.now();
console.log('Token valid:', expiresAt > now);
```

**curl Test:**

```bash
# Simulate authorization redirect (get auth code)
# Note: This is complex via curl, better to use browser
# But you can test token exchange endpoint:

# 1. Get authorization code from browser callback URL
# Example: http://tenant1.localhost:3000/auth/callback?code=abc123&state=xyz

# 2. Test token exchange
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"AUTHORIZATION_CODE_FROM_CALLBACK\",\"redirect_uri\":\"http://tenant1.localhost:3000/auth/callback\"}"

# Expected response:
# {
#   "access_token": "...",
#   "refresh_token": "...",
#   "expires_in": 3600,
#   "user": {
#     "email": "user@example.com",
#     "name": "User Name"
#   }
# }
```

**Debug Tips:**

```bash
# If redirect fails:
# 1. Check OAuth Client configured in Frappe:
#    - Go to: http://auth.localhost:8080
#    - Login as Administrator
#    - Search: "OAuth Client"
#    - Verify Client ID, Client Secret, Redirect URIs

# 2. Check redirect URI matches exactly:
echo "Configured: http://tenant1.localhost:3000/auth/callback"
echo "Actual: (check callback URL in browser)"

# 3. Check CORS settings in Frappe site_config.json:
cat ~/frappe-bench/sites/auth.localhost/site_config.json
# Should have:
# "allow_cors": "*"

# If token exchange fails:
# 1. Check Next.js API route exists: app/api/auth/token/route.ts
# 2. Check environment variables loaded:
#    console.log(process.env.OAUTH_CLIENT_SECRET)
# 3. Check Frappe token endpoint accessible:
curl http://auth.localhost:8080/api/method/frappe.integrations.oauth2.get_token
```

### Test 5: Token Validation

**Objective:** Verify access token works for API calls

**Browser Test:**

```javascript
// In DevTools Console (after login)
const token = localStorage.getItem('access_token');

// Test authenticated API call
fetch('http://api.tenant1.localhost:8080/api/method/frappe.auth.get_logged_user', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('Current user:', data));

// Expected: User email or name
```

**curl Test:**

```bash
# Replace YOUR_TOKEN with actual token from localStorage
curl http://api.tenant1.localhost:8080/api/method/frappe.auth.get_logged_user \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {"message":"user@example.com"}

# Test invalid token
curl http://api.tenant1.localhost:8080/api/method/frappe.auth.get_logged_user \
  -H "Authorization: Bearer invalid_token"

# Expected response:
# 401 Unauthorized or authentication error
```

### Test 6: Token Expiration Handling

**Objective:** Verify frontend handles expired tokens

**Browser Test:**

```javascript
// Force token expiration
localStorage.setItem('token_expires_at', Date.now() - 1000);

// Try to make API call
const { getAuthToken } = require('./lib/api-client');
getAuthToken(); // Should return null and redirect to login

// Or simulate via UI:
// 1. Wait for token to naturally expire (check expires_in from OAuth response)
// 2. Try to access protected page
// 3. Should redirect to /auth/login
```

---

## API Isolation Testing

### Test 7: Tenant Data Isolation

**Objective:** Verify tenant1 cannot access tenant2's data

**Setup:**

```bash
# Create test data in tenant1
curl -X POST http://api.tenant1.localhost:8080/api/resource/Customer \
  -H "Authorization: Bearer TENANT1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"customer_name\":\"Tenant1 Customer\",\"customer_type\":\"Company\"}"

# Create test data in tenant2
curl -X POST http://api.tenant2.localhost:8080/api/resource/Customer \
  -H "Authorization: Bearer TENANT2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"customer_name\":\"Tenant2 Customer\",\"customer_type\":\"Company\"}"
```

**Test Isolation:**

```bash
# Try to access tenant2's data from tenant1
curl http://api.tenant2.localhost:8080/api/resource/Customer \
  -H "Authorization: Bearer TENANT1_TOKEN"

# Expected: 401 Unauthorized or 403 Forbidden
# Should NOT return tenant2's customers

# Verify tenant1 can access own data
curl http://api.tenant1.localhost:8080/api/resource/Customer \
  -H "Authorization: Bearer TENANT1_TOKEN"

# Expected: List of tenant1's customers only
```

### Test 8: Database Isolation

**Objective:** Verify separate databases per tenant

**SSH to Frappe server:**

```bash
ssh frappe@103.224.243.242

# Connect to MariaDB
mysql -u root -p

# List databases
SHOW DATABASES;

# Expected output:
# +-----------------------------+
# | Database                    |
# +-----------------------------+
# | _auth_localhost             |
# | _api_tenant1_localhost      |
# | _api_tenant2_localhost      |
# +-----------------------------+

# Verify tenant1 database
USE _api_tenant1_localhost;
SELECT COUNT(*) FROM tabCustomer;

# Verify tenant2 database
USE _api_tenant2_localhost;
SELECT COUNT(*) FROM tabCustomer;

# Should have different counts
```

### Test 9: File Upload Isolation

**Objective:** Verify uploaded files are isolated per tenant

**Browser Test:**

1. Login to tenant1
2. Upload a file (e.g., in any form)
3. Note the file URL: `http://api.tenant1.localhost:8080/files/image.jpg`
4. Logout and login to tenant2
5. Try to access tenant1's file

```bash
# Try to access tenant1's file from tenant2 context
curl http://api.tenant1.localhost:8080/files/TENANT1_FILE.jpg \
  -H "Authorization: Bearer TENANT2_TOKEN"

# Expected: 403 Forbidden or 404 Not Found
```

---

## Common Misconfigurations

### Issue 1: DNS Not Resolving

**Symptoms:**

- Browser shows "This site can't be reached"
- `ERR_NAME_NOT_RESOLVED`

**Test:**

```bash
# Windows
nslookup tenant1.localhost

# Linux/Mac
dig tenant1.localhost

# Expected: 127.0.0.1
```

**Fix:**

```bash
# Windows (Run as Administrator)
notepad C:\Windows\System32\drivers\etc\hosts

# Add missing entries:
127.0.0.1    tenant1.localhost
127.0.0.1    api.tenant1.localhost

# Flush DNS cache
ipconfig /flushdns
```

### Issue 2: Middleware Not Running

**Symptoms:**

- `x-tenant` header missing
- All tenants behave the same

**Test:**

```bash
curl -v http://tenant1.localhost:3000 2>&1 | findstr "x-tenant"

# If no output, middleware not running
```

**Fix:**

1. Check `middleware.ts` exports config:

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

2. Restart Next.js:

```bash
# Stop dev server (Ctrl+C)
npm run dev
```

3. Check middleware logs:

```typescript
// Add to middleware.ts
console.log('[Middleware] Running for:', request.nextUrl.pathname);
console.log('[Middleware] Tenant:', tenant);
```

### Issue 3: CORS Errors

**Symptoms:**

- Browser console: `CORS policy: No 'Access-Control-Allow-Origin' header`
- API calls fail from frontend

**Test:**

```bash
curl -v http://api.tenant1.localhost:8080/api/method/ping \
  -H "Origin: http://tenant1.localhost:3000" \
  2>&1 | findstr "Access-Control"

# Should show: Access-Control-Allow-Origin header
```

**Fix:**

```bash
# SSH to Frappe server
cd ~/frappe-bench

# Update site_config.json
bench --site api.tenant1.localhost set-config allow_cors "*"

# Or specific origins
bench --site api.tenant1.localhost set-config allow_cors '["http://tenant1.localhost:3000"]'

# Restart
sudo supervisorctl restart all
```

### Issue 4: OAuth Redirect URI Mismatch

**Symptoms:**

- OAuth error: "Redirect URI mismatch"
- Callback fails with 400 error

**Test:**

```bash
# Check configured redirect URI in Frappe
curl http://auth.localhost:8080/api/resource/OAuth%20Client/YOUR_CLIENT_ID \
  -H "Authorization: token ADMIN_TOKEN"

# Compare with actual callback URL in browser
```

**Fix:**

1. Login to `http://auth.localhost:8080` as Administrator
2. Search for "OAuth Client"
3. Edit your OAuth Client
4. Add/Update Redirect URIs:
   - `http://tenant1.localhost:3000/auth/callback`
   - `http://tenant2.localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback`
5. Save

### Issue 5: Token Not Being Sent

**Symptoms:**

- API returns 401 even after login
- Token exists in localStorage but not in requests

**Test:**

```javascript
// Browser DevTools Console
console.log('Token exists:', !!localStorage.getItem('access_token'));

// Check if token is being sent
fetch('http://api.tenant1.localhost:8080/api/method/ping')
  .then(r => {
    console.log('Request headers:', r.headers);
    return r.json();
  });
```

**Fix:**

Check `lib/api-client.ts` `apiRequest` function includes Authorization header:

```typescript
const headers: HeadersInit = {
  'Content-Type': 'application/json',
  ...options.headers,
};

const token = getAuthToken();
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

### Issue 6: Backend Site Not Created

**Symptoms:**

- 502 Bad Gateway
- "Site not found" error

**Test:**

```bash
# SSH to Frappe
ssh frappe@103.224.243.242
cd ~/frappe-bench

# List sites
bench --site all list-sites

# Check if api.tenant1.localhost exists
```

**Fix:**

```bash
# Create missing site
bench new-site api.tenant1.localhost \
  --admin-password admin123 \
  --db-name _api_tenant1_localhost

# Install apps
bench --site api.tenant1.localhost install-app erpnext

# Configure API-only mode
bench --site api.tenant1.localhost set-config disable_user_pass_login 1
bench --site api.tenant1.localhost set-config disable_signup 1

# Restart
sudo supervisorctl restart all
```

---

## Debug Tips

### 1. Enable Verbose Logging

**Next.js:**

```typescript
// lib/api-client.ts
export async function apiRequest(/* ... */) {
  console.log('[API] Request:', {
    url: fullUrl,
    method: options.method,
    headers: headers,
    body: options.body
  });
  
  const response = await fetch(fullUrl, finalOptions);
  
  console.log('[API] Response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });
  
  // ... rest of code
}
```

**Frappe:**

```bash
# Enable debug mode
bench --site api.tenant1.localhost set-config developer_mode 1

# Check logs
tail -f ~/frappe-bench/logs/web.error.log
tail -f ~/frappe-bench/logs/web.access.log
```

### 2. Network Inspection

**Browser DevTools:**

1. Open DevTools (F12)
2. Network tab
3. Filter by "XHR" or "Fetch"
4. Click on any API request
5. Check:
   - Request URL (should be api.tenant1.localhost)
   - Request Headers (Authorization: Bearer ...)
   - Response (status, body)

### 3. Check Service Status

```bash
# Check Next.js process
# Windows
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Check port usage
netstat -ano | findstr :3000
netstat -ano | findstr :8080

# Linux (SSH to Frappe server)
sudo supervisorctl status

# Expected:
# frappe-bench-web:frappe-bench-web_00   RUNNING
# frappe-bench-workers:frappe-bench-worker_short_00  RUNNING
# ...
```

### 4. Database Inspection

```bash
# SSH to Frappe
ssh frappe@103.224.243.242

# Connect to tenant1's database
mysql -u root -p _api_tenant1_localhost

# Check tables
SHOW TABLES;

# Check users
SELECT name, email, enabled FROM tabUser;

# Check OAuth tokens
SELECT * FROM `tabOAuth Bearer Token` ORDER BY creation DESC LIMIT 10;
```

### 5. Test API Endpoints Directly

```bash
# Ping (no auth required)
curl http://api.tenant1.localhost:8080/api/method/ping

# Get current user (auth required)
curl http://api.tenant1.localhost:8080/api/method/frappe.auth.get_logged_user \
  -H "Authorization: Bearer YOUR_TOKEN"

# List customers (auth required)
curl http://api.tenant1.localhost:8080/api/resource/Customer \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific resource
curl http://api.tenant1.localhost:8080/api/resource/Customer/CUST-001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Quick Diagnostic Script

**Save as `diagnose.ps1`:**

```powershell
# Multi-Tenant SaaS Diagnostics

Write-Host "=== Multi-Tenant SaaS Diagnostics ===" -ForegroundColor Cyan

# Check hosts file
Write-Host "`n[1] Checking hosts file..." -ForegroundColor Yellow
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath
if ($hostsContent -match "tenant1.localhost") {
    Write-Host "✅ tenant1.localhost found in hosts" -ForegroundColor Green
} else {
    Write-Host "❌ tenant1.localhost NOT in hosts file" -ForegroundColor Red
}

# Check Next.js
Write-Host "`n[2] Checking Next.js (port 3000)..." -ForegroundColor Yellow
$nextjs = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($nextjs) {
    Write-Host "✅ Next.js running on port 3000" -ForegroundColor Green
} else {
    Write-Host "❌ Next.js NOT running" -ForegroundColor Red
}

# Check Frappe
Write-Host "`n[3] Checking Frappe (port 8080)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frappe responding on port 8080" -ForegroundColor Green
} catch {
    Write-Host "❌ Frappe NOT responding" -ForegroundColor Red
}

# Test tenant1
Write-Host "`n[4] Testing tenant1.localhost:3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://tenant1.localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ tenant1 frontend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ tenant1 frontend NOT accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test tenant1 backend
Write-Host "`n[5] Testing api.tenant1.localhost:8080..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://api.tenant1.localhost:8080/api/method/ping" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ tenant1 backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ tenant1 backend NOT accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Check .env.local
Write-Host "`n[6] Checking environment variables..." -ForegroundColor Yellow
$envPath = ".env.local"
if (Test-Path $envPath) {
    $env = Get-Content $envPath
    if ($env -match "OAUTH_CLIENT_ID") {
        Write-Host "✅ OAuth credentials configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  OAuth credentials missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env.local not found" -ForegroundColor Red
}

Write-Host "`n=== Diagnostics Complete ===" -ForegroundColor Cyan
```

**Run:**

```powershell
cd "C:\Users\Vedant Singh Thakur\Downloads\nexus_erp"
.\diagnose.ps1
```

---

## Complete Test Checklist

### ✅ Pre-Flight

- [ ] Hosts file configured
- [ ] Next.js running (port 3000)
- [ ] Frappe running (port 8080)
- [ ] Environment variables set
- [ ] Frappe sites created

### ✅ Tenant Routing

- [ ] tenant1.localhost resolves
- [ ] tenant2.localhost resolves
- [ ] x-tenant header present
- [ ] Backend URL resolves correctly
- [ ] Cross-tenant isolation works

### ✅ OAuth Login

- [ ] Login page accessible
- [ ] Redirect to auth server works
- [ ] Authorization screen shows
- [ ] Callback receives code
- [ ] Token exchange succeeds
- [ ] Tokens stored in localStorage
- [ ] Redirect to dashboard works

### ✅ API Isolation

- [ ] Authenticated API calls work
- [ ] Invalid tokens rejected
- [ ] Cross-tenant access blocked
- [ ] Database isolation verified
- [ ] File upload isolation works

### ✅ Error Handling

- [ ] Expired tokens handled
- [ ] Invalid redirect URI detected
- [ ] CORS configured correctly
- [ ] 401/403 responses handled
- [ ] Network errors handled

---

## Quick Reference

### Essential URLs

```
Frontend:
- Tenant 1: http://tenant1.localhost:3000
- Tenant 2: http://tenant2.localhost:3000

Backend:
- Tenant 1 API: http://api.tenant1.localhost:8080
- Tenant 2 API: http://api.tenant2.localhost:8080

Auth:
- OAuth Server: http://auth.localhost:8080
- OAuth Login: http://tenant1.localhost:3000/auth/login
- OAuth Callback: http://tenant1.localhost:3000/auth/callback
```

### Essential Commands

```bash
# Start Next.js
npm run dev

# Check token in browser
localStorage.getItem('access_token')

# Test API
curl http://api.tenant1.localhost:8080/api/method/ping

# Restart Frappe
sudo supervisorctl restart all
```

Happy testing! 🧪
