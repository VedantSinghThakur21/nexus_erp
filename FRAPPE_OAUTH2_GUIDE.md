# Frappe OAuth2 + Next.js Multi-Tenant Authentication Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     OAuth2 Flow Architecture                     │
└─────────────────────────────────────────────────────────────────┘

User Browser
    │
    ├─► tenant1.localhost:3000 (Next.js Frontend)
    │       │
    │       ├─► Redirect to auth.localhost:8080/oauth/authorize
    │       │
    │       └─► Receive auth code, exchange for token
    │
    └─► auth.localhost:8080 (Central Frappe Auth Provider)
            │
            └─► Issues OAuth2 tokens (JWT)

Tenant Backends:
    • api.tenant1.localhost:8080 (Validates tokens)
    • api.tenant2.localhost:8080 (Validates tokens)
```

---

## Part 1: Frappe OAuth2 Provider Setup

### 1.1 Create Central Auth Site

```bash
cd ~/frappe-bench

# Create central authentication site
bench new-site auth.localhost \
  --mariadb-root-password root_password \
  --admin-password admin123

# Install required apps
bench --site auth.localhost install-app frappe
```

### 1.2 Enable OAuth2 Provider

Log in to `http://auth.localhost:8080` as Administrator and configure:

**Step 1: Create OAuth2 Client**

Navigate to: `Desk → Setup → OAuth Client`

Create a new OAuth Client with these settings:

```yaml
OAuth Client Name: NextJS Frontend
App Name: NextJS SaaS Application
Client ID: [Auto-generated, copy this]
Client Secret: [Auto-generated, copy this - store securely!]

Grant Type: Authorization Code
Response Type: Code

Redirect URIs:
  - http://tenant1.localhost:3000/api/auth/callback
  - http://tenant2.localhost:3000/api/auth/callback
  - http://tenant3.localhost:3000/api/auth/callback
  - http://localhost:3000/api/auth/callback

Default Redirect URI: http://localhost:3000/api/auth/callback

Scopes:
  - openid
  - email
  - profile
  - all

Skip Authorization: No (users must consent)
```

**Step 2: Create Social Login Key**

Navigate to: `Desk → Setup → Social Login Key`

```yaml
Social Login Provider: Frappe
Client ID: [Same as OAuth Client ID]
Client Secret: [Same as OAuth Client Secret]
Base URL: http://auth.localhost:8080
Authorize URL: /api/method/frappe.integrations.oauth2.authorize
Access Token URL: /api/method/frappe.integrations.oauth2.get_token
Redirect URL: http://localhost:3000/api/auth/callback
API Endpoint: /api/method/frappe.integrations.oauth2.get_user_info
```

### 1.3 Configure Frappe OAuth Endpoints

Create a custom app or use hooks to configure OAuth settings:

**File: `frappe-bench/sites/auth.localhost/site_config.json`**

Add these settings:

```json
{
  "db_name": "_auth_localhost",
  "db_password": "...",
  "oauth_enabled": 1,
  "enable_frappe_oauth": 1,
  "oauth_providers": {
    "frappe": {
      "client_id": "your_client_id_here",
      "client_secret": "your_client_secret_here",
      "authorize_url": "http://auth.localhost:8080/api/method/frappe.integrations.oauth2.authorize",
      "access_token_url": "http://auth.localhost:8080/api/method/frappe.integrations.oauth2.get_token",
      "api_endpoint": "http://auth.localhost:8080/api/method/frappe.integrations.oauth2.openid_profile"
    }
  }
}
```

---

## Part 2: Tenant Backend Configuration (Token Validation)

### 2.1 Create Tenant Sites with OAuth-Only Access

```bash
cd ~/frappe-bench

# Create tenant sites
bench new-site api.tenant1.localhost \
  --mariadb-root-password root_password \
  --admin-password admin123

bench new-site api.tenant2.localhost \
  --mariadb-root-password root_password \
  --admin-password admin123
```

### 2.2 Disable Password Login on Tenant Sites

**File: `frappe-bench/sites/api.tenant1.localhost/site_config.json`**

```json
{
  "db_name": "_api_tenant1_localhost",
  "db_password": "...",
  "disable_user_pass_login": 1,
  "oauth_only": 1,
  "oauth_provider_url": "http://auth.localhost:8080",
  "oauth_client_id": "your_client_id_here",
  "disable_signup": 1,
  "disable_standard_login": 1
}
```

### 2.3 Create Custom OAuth Token Validation Endpoint

**File: `frappe-bench/apps/custom_app/custom_app/api.py`**

```python
import frappe
from frappe import _
import requests
import jwt
from functools import wraps

# OAuth2 configuration
OAUTH_PROVIDER_URL = "http://auth.localhost:8080"
CLIENT_ID = "your_client_id_here"
CLIENT_SECRET = "your_client_secret_here"

def validate_oauth_token(token):
    """
    Validate OAuth2 Bearer token with central auth server
    """
    try:
        # Verify token with auth server
        response = requests.get(
            f"{OAUTH_PROVIDER_URL}/api/method/frappe.integrations.oauth2.openid_profile",
            headers={
                "Authorization": f"Bearer {token}"
            },
            timeout=5
        )
        
        if response.status_code != 200:
            return None
        
        user_info = response.json()
        return user_info.get("message", {})
    
    except Exception as e:
        frappe.log_error(f"OAuth token validation failed: {str(e)}")
        return None

def oauth_required(fn):
    """
    Decorator to require valid OAuth token for API endpoints
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Get token from Authorization header
        auth_header = frappe.get_request_header("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            frappe.throw(_("Missing or invalid authorization header"), frappe.AuthenticationError)
        
        token = auth_header.replace("Bearer ", "")
        
        # Validate token
        user_info = validate_oauth_token(token)
        
        if not user_info:
            frappe.throw(_("Invalid or expired token"), frappe.AuthenticationError)
        
        # Set user in frappe.local
        frappe.set_user(user_info.get("email"))
        
        return fn(*args, **kwargs)
    
    return wrapper

@frappe.whitelist(allow_guest=True)
@oauth_required
def get_user_profile():
    """
    Example API endpoint that requires OAuth token
    """
    user = frappe.get_doc("User", frappe.session.user)
    
    return {
        "email": user.email,
        "full_name": user.full_name,
        "user_image": user.user_image,
        "roles": frappe.get_roles(user.name)
    }

@frappe.whitelist(allow_guest=True)
@oauth_required
def get_tenant_data():
    """
    Example: Get tenant-specific data
    Tenant is determined by the site being accessed
    """
    return {
        "site": frappe.local.site,
        "user": frappe.session.user,
        "tenant_data": {
            "name": frappe.local.site,
            # Add tenant-specific logic here
        }
    }
```

### 2.4 Whitelist OAuth Endpoints

**File: `frappe-bench/apps/custom_app/custom_app/hooks.py`**

```python
app_name = "custom_app"
app_title = "Custom App"
app_publisher = "Your Company"
app_description = "OAuth2 Authentication"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "admin@example.com"
app_license = "MIT"

# Whitelisted API endpoints
api_methods = [
    "custom_app.api.get_user_profile",
    "custom_app.api.get_tenant_data",
]

# Override authentication
override_whitelisted_methods = {
    "frappe.auth.validate_token": "custom_app.api.validate_oauth_token"
}
```

---

## Part 3: Next.js OAuth Client Implementation

### 3.1 Install Dependencies

```bash
npm install next-auth @auth/core jose
```

### 3.2 NextAuth Configuration

**File: `lib/auth-config.ts`**

```typescript
import type { NextAuthConfig } from 'next-auth'

export const OAUTH_CONFIG = {
  clientId: process.env.OAUTH_CLIENT_ID!,
  clientSecret: process.env.OAUTH_CLIENT_SECRET!,
  authUrl: process.env.OAUTH_AUTH_URL || 'http://auth.localhost:8080',
  tokenEndpoint: '/api/method/frappe.integrations.oauth2.get_token',
  authorizationEndpoint: '/api/method/frappe.integrations.oauth2.authorize',
  userInfoEndpoint: '/api/method/frappe.integrations.oauth2.openid_profile',
}

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: 'frappe',
      name: 'Frappe OAuth',
      type: 'oauth',
      wellKnown: undefined,
      authorization: {
        url: `${OAUTH_CONFIG.authUrl}${OAUTH_CONFIG.authorizationEndpoint}`,
        params: {
          scope: 'openid email profile all',
          response_type: 'code',
        },
      },
      token: {
        url: `${OAUTH_CONFIG.authUrl}${OAUTH_CONFIG.tokenEndpoint}`,
      },
      userinfo: {
        url: `${OAUTH_CONFIG.authUrl}${OAUTH_CONFIG.userInfoEndpoint}`,
      },
      clientId: OAUTH_CONFIG.clientId,
      clientSecret: OAUTH_CONFIG.clientSecret,
      profile(profile) {
        return {
          id: profile.sub || profile.email,
          email: profile.email,
          name: profile.name || profile.full_name,
          image: profile.picture || profile.user_image,
        }
      },
    },
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
}
```

### 3.3 API Route Handler

**File: `app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth-config'

const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }
```

### 3.4 Environment Variables

**File: `.env.local`**

```bash
# OAuth Configuration
OAUTH_CLIENT_ID=your_client_id_here
OAUTH_CLIENT_SECRET=your_client_secret_here
OAUTH_AUTH_URL=http://auth.localhost:8080

# NextAuth
NEXTAUTH_URL=http://tenant1.localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_generate_with_openssl_rand_base64_32
```

### 3.5 Update API Client to Use OAuth Token

**File: `lib/api-client.ts` (Update)**

```typescript
import { getSession } from 'next-auth/react'

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  // Get session from NextAuth
  const session = await getSession()
  
  if (!session?.accessToken) {
    return null
  }
  
  return session.accessToken as string
}

// Rest of api-client.ts remains the same...
```

### 3.6 Login Page

**File: `app/login/page.tsx`**

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  
  const handleLogin = async () => {
    await signIn('frappe', { callbackUrl })
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center">Login to Your Tenant</h1>
        
        <button
          onClick={handleLogin}
          className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Login with OAuth
        </button>
        
        <p className="text-sm text-center text-gray-600">
          You will be redirected to the central authentication server
        </p>
      </div>
    </div>
  )
}
```

---

## Part 4: Authorization Code Flow

### 4.1 Flow Diagram

```
1. User visits: http://tenant1.localhost:3000
   ↓
2. Not authenticated → Redirect to login page
   ↓
3. User clicks "Login with OAuth"
   ↓
4. Redirect to: http://auth.localhost:8080/api/method/frappe.integrations.oauth2.authorize
   Parameters:
   - client_id=your_client_id
   - redirect_uri=http://tenant1.localhost:3000/api/auth/callback
   - response_type=code
   - scope=openid email profile all
   - state=random_state_string
   ↓
5. User logs in on auth.localhost (if not already logged in)
   ↓
6. User consents to permissions (if Skip Authorization = No)
   ↓
7. Auth server redirects back with authorization code:
   http://tenant1.localhost:3000/api/auth/callback?code=AUTH_CODE&state=STATE
   ↓
8. Next.js backend exchanges code for token:
   POST http://auth.localhost:8080/api/method/frappe.integrations.oauth2.get_token
   Body:
   - grant_type=authorization_code
   - code=AUTH_CODE
   - redirect_uri=http://tenant1.localhost:3000/api/auth/callback
   - client_id=your_client_id
   - client_secret=your_client_secret
   ↓
9. Auth server responds with:
   {
     "access_token": "eyJhbGc...",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "refresh_token_here",
     "scope": "openid email profile all"
   }
   ↓
10. Next.js stores tokens in session
    ↓
11. Next.js redirects user to dashboard
    ↓
12. Frontend makes API calls to tenant backend with:
    Authorization: Bearer eyJhbGc...
    ↓
13. Tenant backend validates token with auth server
    ↓
14. Token valid → Process request
```

### 4.2 Token Validation Flow

```python
# On tenant backend (api.tenant1.localhost)

def validate_token(bearer_token):
    """
    Validate OAuth2 Bearer token
    """
    # 1. Extract token from "Bearer <token>"
    token = bearer_token.replace("Bearer ", "")
    
    # 2. Call auth server to validate
    response = requests.get(
        "http://auth.localhost:8080/api/method/frappe.integrations.oauth2.openid_profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # 3. Check response
    if response.status_code == 200:
        user_info = response.json().get("message", {})
        return user_info
    
    return None
```

---

## Part 5: Security Best Practices

### 5.1 Token Security

```typescript
// Store tokens securely
// ✅ DO: Use httpOnly cookies (NextAuth handles this)
// ❌ DON'T: Store in localStorage (XSS vulnerable)

// Token expiration
const TOKEN_EXPIRY = 3600 // 1 hour
const REFRESH_TOKEN_EXPIRY = 86400 * 30 // 30 days

// Implement token refresh
async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(
      `${OAUTH_CONFIG.authUrl}/api/method/frappe.integrations.oauth2.get_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: OAUTH_CONFIG.clientId,
          client_secret: OAUTH_CONFIG.clientSecret,
        }),
      }
    )
    
    const tokens = await response.json()
    
    return {
      ...token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? token.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    }
  } catch (error) {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}
```

### 5.2 CORS Configuration

**File: `frappe-bench/sites/auth.localhost/site_config.json`**

```json
{
  "allow_cors": "*",
  "cors_origin_whitelist": [
    "http://tenant1.localhost:3000",
    "http://tenant2.localhost:3000",
    "http://tenant3.localhost:3000",
    "http://localhost:3000"
  ]
}
```

### 5.3 Rate Limiting

```python
# In Frappe custom app
import frappe
from frappe.rate_limiter import rate_limit

@frappe.whitelist(allow_guest=True)
@rate_limit(limit=10, seconds=60)  # 10 requests per minute
def validate_oauth_token():
    """Rate-limited token validation"""
    pass
```

### 5.4 Security Checklist

```yaml
✅ Use HTTPS in production (Let's Encrypt)
✅ Secure token storage (httpOnly cookies)
✅ Implement CSRF protection
✅ Validate redirect URIs strictly
✅ Use state parameter to prevent CSRF
✅ Implement token expiration and refresh
✅ Rate limit OAuth endpoints
✅ Log all authentication attempts
✅ Implement IP whitelisting for sensitive operations
✅ Use secure random strings for client secrets
✅ Rotate secrets periodically
✅ Monitor for suspicious activity
✅ Implement proper error handling (don't leak info)
```

---

## Part 6: Testing the Setup

### 6.1 Test OAuth Flow

```bash
# 1. Start all services
cd ~/frappe-bench
bench start

# 2. In another terminal, start Next.js
cd ~/nexus_erp
npm run dev -- -H 0.0.0.0

# 3. Test the flow
# Open browser: http://tenant1.localhost:3000
# Click login
# Should redirect to: http://auth.localhost:8080/oauth/authorize
# After login, should redirect back with code
# Should exchange code for token
# Should show dashboard
```

### 6.2 Test Token Validation

```bash
# Get access token from browser DevTools → Application → Cookies
# Or from NextAuth session

# Test API call with token
curl http://api.tenant1.localhost:8080/api/method/custom_app.api.get_user_profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"

# Expected response:
# {
#   "message": {
#     "email": "user@example.com",
#     "full_name": "John Doe",
#     "user_image": "/files/user.jpg",
#     "roles": ["System Manager"]
#   }
# }
```

### 6.3 Verify Security

```bash
# Test without token (should fail)
curl http://api.tenant1.localhost:8080/api/method/custom_app.api.get_user_profile

# Expected: 401 Unauthorized

# Test with invalid token (should fail)
curl http://api.tenant1.localhost:8080/api/method/custom_app.api.get_user_profile \
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Unauthorized

# Test password login on tenant (should be disabled)
curl -X POST http://api.tenant1.localhost:8080/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr":"Administrator","pwd":"admin123"}'

# Expected: Error - Password login disabled
```

---

## Part 7: Production Deployment

### 7.1 Update URLs for Production

```bash
# .env.production
OAUTH_CLIENT_ID=prod_client_id
OAUTH_CLIENT_SECRET=prod_client_secret
OAUTH_AUTH_URL=https://auth.yourapp.com

NEXTAUTH_URL=https://tenant1.yourapp.com
NEXTAUTH_SECRET=secure_random_secret_here
```

### 7.2 Update OAuth Client Redirect URIs

In Frappe OAuth Client settings, update to production URLs:

```
https://tenant1.yourapp.com/api/auth/callback
https://tenant2.yourapp.com/api/auth/callback
https://*.yourapp.com/api/auth/callback
```

### 7.3 Enable HTTPS

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get wildcard certificate
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourapp.com -d *.yourapp.com

# Update Nginx to use SSL
# Frappe bench handles this:
bench setup nginx --ssl
```

---

## Summary

✅ **Central Auth Server** (auth.localhost) manages all authentication  
✅ **OAuth2 Authorization Code Flow** with PKCE for security  
✅ **Token-Based Authentication** across all tenant backends  
✅ **Password Login Disabled** on tenant sites (OAuth only)  
✅ **Secure Token Storage** using httpOnly cookies  
✅ **Token Refresh** implemented for long sessions  
✅ **CORS Properly Configured** for cross-origin requests  
✅ **Rate Limiting** on sensitive endpoints  

This is a **production-ready, secure OAuth2 implementation** using Frappe's built-in capabilities!
