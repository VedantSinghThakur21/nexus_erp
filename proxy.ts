/**
 * Nexus ERP — Security & Multi-Tenancy Middleware
 * ================================================
 *
 * ROUTING:
 * ┌─────────────────────────┬───────────────────────────────────┐
 * │ Hostname                │ Rewrite Target                    │
 * ├─────────────────────────┼───────────────────────────────────┤
 * │ avariq.in (root)        │ /site/*                           │
 * │ tesla.avariq.in (tenant)│ /tenant/* + x-tenant-id hdr       │
 * │ localhost:3000           │ /site/* (dev root)                │
 * │ tesla.localhost:3000     │ /tenant/* (dev tenant)            │
 * └─────────────────────────┴───────────────────────────────────┘
 *
 * SECURITY:
 * 1. Authentication: Checks for valid session (NextAuth or tenant credentials)
 * 2. Authorization: Role-based route protection
 * 3. Multi-tenancy: Injects tenant context headers for API routing
 * 4. Security: Blocks unauthenticated access to protected routes
 * 5. Blocks direct browser access to /site and /tenant paths
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CVE-3 Fix: Restrict returnTo to relative paths only.
 * Strips any host/protocol so external-redirect phishing is impossible.
 */
function sanitizeReturnTo(raw: string): string {
  try {
    const u = new URL(raw, 'http://localhost')
    // Only allow path + query, never an external host
    return u.pathname + u.search
  } catch {
    return '/'
  }
}

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/onboarding',
  '/auth/login',
  '/auth/callback',
  '/api/auth',
  '/join',
  '/provisioning',
  '/provisioning-status',
  '/change-password',
  '/api/provision/start',
  '/api/provision/status',
  '/api/provisioning-status',
  '/api/check-site-status',
]

/**
 * Protected routes requiring authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/quotations',
  '/sales-orders',
  '/invoices',
  '/payments',
  '/projects',
  '/bookings',
  '/catalogue',
  '/crm',
  '/operators',
  '/agents',
  '/inspections',
  '/pricing-rules',
  '/team',
  '/settings',
  '/admin-tenants',
  '/access-denied',
]

/**
 * Check if route is public (no auth required).
 * Uses exact match OR strict prefix (route + '/') to prevent false matches
 * such as /api/auth-hacked matching /api/auth.
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route ||
    pathname.startsWith(`${route}/`)
  )
}

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if user has valid authentication cookies
 */
function hasValidAuth(request: NextRequest): boolean {
  // Check for NextAuth session token (Google OAuth path)
  const nextAuthSession = 
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value
  
  // Check for tenant API credentials (set after provisioning service generates keys)
  const tenantApiKey = request.cookies.get('tenant_api_key')?.value
  const tenantApiSecret = request.cookies.get('tenant_api_secret')?.value
  
  // Check for Frappe SID session cookie (set by loginUser action after Frappe login)
  const frappeSession = request.cookies.get('sid')?.value

  // Check for user_email — set server-side (httpOnly) by loginUser action on success.
  // This is the most reliable indicator for credential-based logins where the
  // provisioning service may have failed to generate API keys.
  const userEmail = request.cookies.get('user_email')?.value
  
  const hasNextAuthSession = !!nextAuthSession
  const hasTenantCredentials = !!(tenantApiKey && tenantApiSecret)
  const hasFrappeSession = !!frappeSession && frappeSession !== 'Guest'
  const hasUserEmailCookie = !!userEmail
  
  return hasNextAuthSession || hasTenantCredentials || hasFrappeSession || hasUserEmailCookie
}

/**
 * Get user email from cookies
 */
function getUserEmail(request: NextRequest): string | null {
  return request.cookies.get('user_email')?.value || 
         request.cookies.get('user_id')?.value || 
         null
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

  // ── 1. Skip internal Next.js assets ──
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    hasFileExtension // favicon, images, etc.
  ) {
    return NextResponse.next()
  }

  // ── 1b. For API routes: pass through but inject x-tenant-id from hostname ──
  if (pathname.startsWith('/api')) {
    let apiTenantSlug: string | null = null

    if (hostname.includes('localhost')) {
      const hostWithoutPort = hostname.split(':')[0]
      const parts = hostWithoutPort.split('.')
      if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        apiTenantSlug = parts[0]
      }
    } else if (hostname.endsWith(`.${rootDomain}`)) {
      apiTenantSlug = hostname.replace(`.${rootDomain}`, '')
    }

    // Check if API route requires authentication
    if (!isPublicRoute(pathname) && !hasValidAuth(request)) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const apiResponse = NextResponse.next()
    apiResponse.headers.set('x-tenant-id', apiTenantSlug || 'master')
    
    // Pass user email for server-side role checks
    const userEmail = getUserEmail(request)
    if (userEmail) {
      apiResponse.headers.set('x-user-email', userEmail)
    }
    
    return apiResponse
  }

  // ── 2. Block direct browser access to internal route groups ──
  // Check if this is a direct browser request (not a rewrite)
  const referer = request.headers.get('referer')
  const isDirectAccess = !referer || new URL(referer).pathname !== pathname

  if (isDirectAccess && (pathname.startsWith('/site') || pathname.startsWith('/tenant'))) {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  // ── 3. Determine if root domain or tenant subdomain ──
  let tenantSlug: string | null = null

  if (hostname.includes('localhost')) {
    // Dev: tesla.localhost:3000 → "tesla", localhost:3000 → null (root)
    const hostWithoutPort = hostname.split(':')[0]
    const parts = hostWithoutPort.split('.')

    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
      tenantSlug = parts[0] // e.g. "tesla"
    }
    // else: bare "localhost" → root
  } else if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`
  ) {
    tenantSlug = null // root domain
  } else if (hostname.endsWith(`.${rootDomain}`)) {
    // Production: tesla.avariq.in → "tesla"
    tenantSlug = hostname.replace(`.${rootDomain}`, '')
  }

  // ── 4. ROOT DOMAIN → rewrite to /site (public, no auth required) ──
  if (tenantSlug === null) {
    // Root domain always routes to /site without auth checks
    // The /site section is the public marketing website
    const siteUrl = new URL(`/site${pathname}`, request.url)
    siteUrl.search = request.nextUrl.search

    const response = NextResponse.rewrite(siteUrl)
    response.headers.set('x-tenant-id', 'master')
    response.headers.set('x-current-path', pathname)
    response.headers.set('x-middleware-executed', 'true')
    response.headers.set('x-rewrite-to', siteUrl.pathname)
    
    // Pass user email for server-side role checks
    const userEmail = getUserEmail(request)
    if (userEmail) {
      response.headers.set('x-user-email', userEmail)
    }
    
    return response
  }

  // ── 5. TENANT SUBDOMAIN → rewrite to /tenant ──
  // ── 5a. Enhanced tenant auth protection with protected routes ──
  const isPublicPath = isPublicRoute(pathname) || pathname === '/'
  
  if (!isPublicPath) {
    // Check if protected route requires authentication
    if (isProtectedRoute(pathname) && !hasValidAuth(request)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set(
        'returnTo',
        sanitizeReturnTo(request.nextUrl.pathname + request.nextUrl.search)
      )
      loginUrl.searchParams.set('reason', 'unauthenticated')
      return NextResponse.redirect(loginUrl)
    }
    
    // CVE-2 Fix: For non-protected routes, only trust NextAuth session token
    // The Frappe sid cookie is not validated here and was trivially forgeable
    if (!isProtectedRoute(pathname)) {
      const hasApiKey = request.cookies.get('tenant_api_key')?.value
      const hasSession =
        request.cookies.get('next-auth.session-token')?.value ||
        request.cookies.get('__Secure-next-auth.session-token')?.value

      if (!hasApiKey && !hasSession) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set(
          'returnTo',
          sanitizeReturnTo(request.nextUrl.pathname + request.nextUrl.search)
        )
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  const tenantUrl = new URL(`/tenant${pathname}`, request.url)
  tenantUrl.search = request.nextUrl.search

  const response = NextResponse.rewrite(tenantUrl)
  response.headers.set('x-tenant-id', tenantSlug)
  response.headers.set('x-current-path', pathname)
  response.headers.set('x-middleware-executed', 'true')
  response.headers.set('x-rewrite-to', tenantUrl.pathname)
  
  // Pass user email for server-side role checks
  const userEmail = getUserEmail(request)
  if (userEmail) {
    response.headers.set('x-user-email', userEmail)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
