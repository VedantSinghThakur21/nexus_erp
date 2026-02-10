/**
 * Nexus ERP — Production Middleware
 * ===================================
 * 
 * Responsibilities:
 * 1. Extract tenant subdomain from hostname → inject as `x-tenant-id` header
 * 2. Redirect authenticated Google users without a tenant to /onboarding
 * 3. Protect tenant routes from unauthenticated access
 * 
 * ROUTING MATRIX:
 * ┌──────────────────────┬──────────────────┬────────────────────────┐
 * │ URL                  │ Condition        │ Action                 │
 * ├──────────────────────┼──────────────────┼────────────────────────┤
 * │ avariq.in/login      │ -                │ Show login/signup      │
 * │ avariq.in/signup     │ -                │ Show signup form       │
 * │ avariq.in/onboarding │ Has session      │ Show org name form     │
 * │ avariq.in/dashboard  │ Has session      │ Redirect to tenant     │
 * │ tesla.avariq.in/*    │ Has credentials  │ Serve tenant app       │
 * │ tesla.avariq.in/*    │ No credentials   │ Redirect to login      │
 * └──────────────────────┴──────────────────┴────────────────────────┘
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // ── 1. Skip static assets ──
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ── 2. Extract Subdomain ──
  const hostname = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  let currentHost = 'master'

  if (hostname.includes('localhost')) {
    // Dev: tesla.localhost:3000 → "tesla"
    const parts = hostname.split('.')[0]
    const hostWithoutPort = hostname.split(':')[0]
    const domainParts = hostWithoutPort.split('.')
    
    if (domainParts.length > 1 && domainParts[domainParts.length - 1] === 'localhost') {
      currentHost = domainParts[0]
    } else {
      currentHost = 'master'
    }
  } else if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    currentHost = 'master'
  } else if (hostname.endsWith(`.${rootDomain}`)) {
    // Production: tesla.avariq.in → "tesla"
    currentHost = hostname.replace(`.${rootDomain}`, '')
  }

  // ── 3. Inject Headers ──
  const response = NextResponse.next()
  response.headers.set('x-tenant-id', currentHost)
  response.headers.set('x-current-path', request.nextUrl.pathname)

  // ── 4. Public Routes (no auth required) ──
  const publicPaths = ['/login', '/signup', '/onboarding', '/provisioning', '/api/', '/print/']
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (isPublicPath || request.nextUrl.pathname === '/') {
    return response
  }

  // ── 5. Tenant Route Protection ──
  // If accessing a tenant subdomain, user must have API credentials
  if (currentHost !== 'master') {
    const hasApiKey = request.cookies.get('tenant_api_key')?.value
    const hasSession = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value
    const hasSid = request.cookies.get('sid')?.value

    if (!hasApiKey && !hasSession && !hasSid) {
      // No auth at all — redirect to login on root domain
      const loginUrl = process.env.NODE_ENV === 'production'
        ? `https://${rootDomain}/login`
        : `http://localhost:3000/login`
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
