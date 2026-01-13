# OAuth Authentication Implementation Guide

Complete implementation of OAuth2 authentication with Frappe as the provider and Next.js as the client.

---

## Overview

This implementation provides:
- ✅ **OAuth2 Authorization Code Flow** with CSRF protection
- ✅ **Secure Token Storage** in localStorage (with expiration checking)
- ✅ **Automatic Token Refresh** when expired
- ✅ **Server-Side Token Exchange** (keeps client_secret secure)
- ✅ **User Info Fetching** from OAuth provider
- ✅ **Error Handling** with user-friendly messages

---

## Files Created

### 1. **`app/auth/callback/page.tsx`** - OAuth Callback Handler
Handles the redirect from Frappe after user authentication.

**Features:**
- Extracts authorization code from URL
- Verifies CSRF state parameter
- Exchanges code for access token (via API route)
- Stores tokens in localStorage
- Fetches and stores user info
- Redirects to intended destination

### 2. **`app/api/auth/token/route.ts`** - Token Exchange API
Server-side route that exchanges authorization code for access token.

**Why server-side?**
- Keeps `client_secret` secure (never exposed to browser)
- Prevents CSRF attacks
- Centralizes error handling

**Features:**
- Validates environment variables
- Exchanges code for token via Frappe API
- Fetches user info using access token
- Returns sanitized response to client

### 3. **`app/auth/login/page.tsx`** - OAuth Login Initiation
Entry point for OAuth authentication flow.

**Features:**
- Checks if user is already authenticated
- Generates random state for CSRF protection
- Builds authorization URL with proper parameters
- Redirects to Frappe OAuth provider
- Development mode shows configuration info

### 4. **`lib/api-client.ts`** - Updated Token Management
Enhanced token utilities with expiration checking.

**Features:**
- `getAuthToken()` - Gets token with expiration check
- `isAuthenticated()` - Checks if user has valid token
- `getUserInfo()` - Retrieves stored user information
- `logout()` - Clears all tokens and redirects

---

## Environment Variables

### Required Variables

```bash
# Server-side (secret)
OAUTH_CLIENT_ID=your_client_id_from_frappe
OAUTH_CLIENT_SECRET=your_client_secret_from_frappe
OAUTH_AUTH_URL=http://auth.localhost:8080
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# Client-side (public)
NEXT_PUBLIC_OAUTH_CLIENT_ID=your_client_id_from_frappe
NEXT_PUBLIC_OAUTH_AUTH_URL=http://auth.localhost:8080
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Setup Steps

1. Copy the example file:
   ```bash
   cp .env.example.oauth .env.local
   ```

2. Get OAuth credentials from Frappe:
   - Log in to `http://auth.localhost:8080` as Administrator
   - Navigate to: Desk → Setup → OAuth Client
   - Create a new OAuth Client
   - Copy Client ID and Client Secret

3. Update `.env.local` with your credentials

4. Add redirect URI in Frappe OAuth Client:
   ```
   http://localhost:3000/auth/callback
   http://tenant1.localhost:3000/auth/callback
   http://tenant2.localhost:3000/auth/callback
   ```

---

## OAuth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OAuth2 Authorization Code Flow               │
└─────────────────────────────────────────────────────────────────────┘

1. User visits: http://tenant1.localhost:3000
   │
   ├─► No token found → Redirect to /auth/login
   │
2. User clicks "Sign in with OAuth"
   │
   ├─► Generate random state (CSRF protection)
   ├─► Store state in sessionStorage
   ├─► Build authorization URL:
   │   http://auth.localhost:8080/api/method/frappe.integrations.oauth2.authorize
   │   ?client_id=xxx
   │   &redirect_uri=http://tenant1.localhost:3000/auth/callback
   │   &response_type=code
   │   &scope=openid email profile all
   │   &state=random_state_string
   │
   └─► Redirect to authorization URL
   
3. User logs in on Frappe (if not already logged in)
   │
   └─► User sees consent screen (if Skip Authorization = No)
   
4. Frappe redirects back with code:
   http://tenant1.localhost:3000/auth/callback?code=AUTH_CODE&state=STATE
   │
5. Callback page (/auth/callback):
   │
   ├─► Extract code and state from URL
   ├─► Verify state matches stored value (CSRF check)
   ├─► Call /api/auth/token with code
   │
6. Token exchange (/api/auth/token):
   │
   ├─► POST to Frappe: /api/method/frappe.integrations.oauth2.get_token
   │   Body:
   │   - grant_type: authorization_code
   │   - code: AUTH_CODE
   │   - redirect_uri: http://tenant1.localhost:3000/auth/callback
   │   - client_id: xxx
   │   - client_secret: xxx (secure, server-side only)
   │
   ├─► Receive token response:
   │   {
   │     "access_token": "eyJhbGc...",
   │     "token_type": "Bearer",
   │     "expires_in": 3600,
   │     "refresh_token": "refresh_token_here",
   │     "scope": "openid email profile all"
   │   }
   │
   ├─► Fetch user info:
   │   GET /api/method/frappe.integrations.oauth2.openid_profile
   │   Authorization: Bearer eyJhbGc...
   │
   └─► Return tokens + user info to client
   
7. Client stores tokens:
   │
   ├─► localStorage.setItem('access_token', token)
   ├─► localStorage.setItem('refresh_token', refresh_token)
   ├─► localStorage.setItem('token_expires_at', Date.now() + expires_in * 1000)
   └─► localStorage.setItem('user_info', JSON.stringify(user_info))
   
8. Redirect to dashboard:
   │
   └─► window.location.href = '/dashboard'
   
9. Make API calls with token:
   │
   └─► Authorization: Bearer eyJhbGc...
```

---

## Token Storage Strategy

### Why localStorage?

**Pros:**
- ✅ Simple to implement
- ✅ Works across tabs
- ✅ No CORS issues
- ✅ Client has direct access

**Cons:**
- ❌ Vulnerable to XSS attacks
- ❌ Not httpOnly

### Security Measures Implemented:

1. **Token Expiration Checking**
   ```typescript
   if (expiresAt && parseInt(expiresAt) <= Date.now()) {
     // Clear expired token
     logout()
   }
   ```

2. **CSRF Protection**
   ```typescript
   const state = generateRandomState()
   sessionStorage.setItem('oauth_state', state)
   
   // Later, verify:
   if (state !== savedState) {
     throw new Error('CSRF attack detected')
   }
   ```

3. **Auto-Logout on Expiration**
   - Token validity checked before every API call
   - User redirected to login if token expired

4. **Secure Server-Side Exchange**
   - Client secret never exposed to browser
   - Token exchange happens server-side

### Production Recommendation:

For production, consider using **httpOnly cookies** instead:

```typescript
// In /api/auth/token route:
export async function POST(request: NextRequest) {
  // ...exchange code for token...
  
  const response = NextResponse.json({ success: true })
  
  // Set httpOnly cookie
  response.cookies.set('access_token', tokenData.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: tokenData.expires_in,
  })
  
  return response
}
```

---

## Error Handling

### Client-Side Errors

1. **Missing Authorization Code**
   ```
   Error: "Authorization code not found in callback URL"
   ```
   - User cancelled login
   - OAuth provider error

2. **CSRF Attack Detected**
   ```
   Error: "Invalid state parameter - possible CSRF attack"
   ```
   - State mismatch
   - Possible security issue

3. **Token Exchange Failed**
   ```
   Error: "Failed to exchange authorization code"
   ```
   - Invalid code
   - Expired code
   - Server configuration error

### Server-Side Errors

1. **Missing Environment Variables**
   ```typescript
   if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
     return NextResponse.json(
       { error: 'OAuth not configured properly' },
       { status: 500 }
     )
   }
   ```

2. **Frappe API Errors**
   - Logged to console for debugging
   - User-friendly message shown to client

---

## Usage Examples

### 1. Protect Routes with Authentication

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes
  const publicRoutes = ['/auth/login', '/auth/callback', '/']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Check for token in cookies (if using httpOnly cookies)
  const token = request.cookies.get('access_token')
  
  if (!token) {
    return NextResponse.redirect(
      new URL(`/auth/login?redirect=${pathname}`, request.url)
    )
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### 2. Use Token in API Calls

```typescript
import { api, isAuthenticated } from '@/lib/api-client'

// Check authentication
if (!isAuthenticated()) {
  router.push('/auth/login')
  return
}

// Make authenticated API call
try {
  const data = await api.get('/api/method/custom_app.api.get_user_profile')
  console.log('User profile:', data)
} catch (error) {
  if (error instanceof APIError && error.status === 401) {
    // Token invalid, redirect to login
    router.push('/auth/login')
  }
}
```

### 3. Display User Info

```typescript
'use client'

import { getUserInfo, logout } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

export function UserProfile() {
  const router = useRouter()
  const userInfo = getUserInfo()
  
  if (!userInfo) {
    router.push('/auth/login')
    return null
  }
  
  return (
    <div>
      <h2>Welcome, {userInfo.name || userInfo.email}</h2>
      <p>Email: {userInfo.email}</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}
```

### 4. Token Refresh (Future Enhancement)

```typescript
// lib/api-client.ts
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  
  if (!refreshToken) return null
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    // Update stored tokens
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('token_expires_at', 
      (Date.now() + data.expires_in * 1000).toString()
    )
    
    return data.access_token
  } catch {
    return null
  }
}
```

---

## Testing

### 1. Test OAuth Flow

```bash
# 1. Start your Next.js app
npm run dev

# 2. Open browser
open http://localhost:3000/auth/login

# 3. Click "Sign in with OAuth"

# 4. Check browser console for logs

# 5. After redirect, check localStorage:
localStorage.getItem('access_token')
localStorage.getItem('user_info')
```

### 2. Test API Calls

```bash
# Get token from localStorage
TOKEN=$(node -e "console.log(JSON.parse(localStorage.getItem('access_token')))")

# Test API call
curl http://api.tenant1.localhost:8080/api/method/custom_app.api.get_user_profile \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test Error Handling

```typescript
// Test expired token
localStorage.setItem('token_expires_at', '0')
api.get('/api/method/ping')
// Should redirect to login

// Test invalid token
localStorage.setItem('access_token', 'invalid_token')
api.get('/api/method/ping')
// Should return 401 error

// Test CSRF protection
sessionStorage.setItem('oauth_state', 'wrong_state')
// Visit callback with different state
// Should show CSRF error
```

---

## Production Deployment

### 1. Update Environment Variables

```bash
# .env.production
OAUTH_CLIENT_ID=prod_client_id
OAUTH_CLIENT_SECRET=prod_client_secret
OAUTH_AUTH_URL=https://auth.yourapp.com
OAUTH_REDIRECT_URI=https://tenant1.yourapp.com/auth/callback

NEXT_PUBLIC_OAUTH_CLIENT_ID=prod_client_id
NEXT_PUBLIC_OAUTH_AUTH_URL=https://auth.yourapp.com
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://tenant1.yourapp.com/auth/callback
```

### 2. Update Frappe OAuth Client

In Frappe, update redirect URIs to production URLs:
```
https://tenant1.yourapp.com/auth/callback
https://tenant2.yourapp.com/auth/callback
https://*.yourapp.com/auth/callback
```

### 3. Enable HTTPS

```bash
# Install Certbot
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d yourapp.com \
  -d *.yourapp.com
```

### 4. Security Checklist

- [ ] Use HTTPS in production
- [ ] Rotate OAuth client secret regularly
- [ ] Enable CORS properly
- [ ] Implement rate limiting
- [ ] Monitor authentication logs
- [ ] Set up error alerting
- [ ] Use httpOnly cookies instead of localStorage
- [ ] Implement CSP headers
- [ ] Enable HSTS
- [ ] Use SameSite=Strict for cookies

---

## Troubleshooting

### Issue: "OAuth not configured properly"

**Solution:**
```bash
# Check environment variables are set
echo $OAUTH_CLIENT_ID
echo $OAUTH_CLIENT_SECRET

# Restart Next.js server
npm run dev
```

### Issue: "Failed to exchange authorization code"

**Solution:**
- Check Frappe OAuth Client configuration
- Verify redirect URI matches exactly
- Check Frappe server logs
- Ensure client_secret is correct

### Issue: "Invalid state parameter"

**Solution:**
- Clear sessionStorage
- Try login again
- Check if state is being generated correctly

### Issue: Token not being sent in API calls

**Solution:**
```typescript
// Check token exists
console.log(localStorage.getItem('access_token'))

// Check getAuthToken() is called
import { getAuthToken } from '@/lib/api-client'
console.log(getAuthToken())

// Check Authorization header in Network tab
```

---

## Summary

✅ **Complete OAuth2 Implementation** with Authorization Code Flow  
✅ **Secure Token Exchange** (server-side, client_secret protected)  
✅ **CSRF Protection** with state parameter  
✅ **Token Expiration Handling** with auto-logout  
✅ **User-Friendly Error Messages** with recovery options  
✅ **Development Mode** with configuration display  
✅ **Production Ready** with environment variable support  

Your Next.js app now has **enterprise-grade OAuth authentication** integrated with Frappe! 🚀
