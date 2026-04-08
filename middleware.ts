import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Nexus ERP - Security Middleware
 * ================================
 * 
 * 1. Authentication: Checks for valid session (NextAuth or tenant credentials)
 * 2. Authorization: Role-based route protection
 * 3. Multi-tenancy: Injects tenant context headers for API routing
 * 4. Security: Blocks unauthenticated access to protected routes
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

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
  '/site/login',
  '/site/signup',
  '/site/onboarding',
  '/tenant/login',
  '/tenant/signup',
  '/tenant/change-password',
  '/_next',
  '/favicon.ico',
  '/api/provision/start',
  '/api/provision/status',
  '/api/provisioning-status',
  '/provisioning',
  '/provisioning-status',
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
 * Admin-only routes (require System Manager role)
 * These get additional server-side checks in the route handler/page
 */
const ADMIN_ROUTES = [
  '/admin-tenants',
  '/team',
  '/settings',
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract tenant subdomain from hostname
 */
function extractTenant(hostname: string): string {
  // Production: subdomain.avariq.in -> subdomain
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '')
    return subdomain || 'master'
  }
  
  // Development: subdomain.localhost -> subdomain
  if (hostname.includes('.localhost')) {
    const subdomain = hostname.split('.localhost')[0]
    return subdomain || 'master'
  }
  
  // Root domain or localhost
  return 'master'
}

/**
 * Check if route is public (no auth required)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || 
    pathname.startsWith(`${route}/`) ||
    pathname.startsWith(route)
  )
}

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  // Routes under (main) group are protected
  if (pathname.match(/^\/(dashboard|quotations|sales-orders|invoices|payments|projects|bookings|catalogue|crm|operators|agents|inspections|pricing-rules|team|settings|admin-tenants)/)) {
    return true
  }
  
  // Tenant routes are protected
  if (pathname.startsWith('/tenant/') && !isPublicRoute(pathname)) {
    const tenantPath = pathname.replace('/tenant', '')
    return PROTECTED_ROUTES.some(route => tenantPath.startsWith(route))
  }
  
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if route requires admin privileges
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if user has valid authentication cookies
 */
function hasValidAuth(request: NextRequest): boolean {
  // Check for NextAuth session token
  const nextAuthSession = 
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value
  
  // Check for tenant API credentials
  const tenantApiKey = request.cookies.get('tenant_api_key')?.value
  const tenantApiSecret = request.cookies.get('tenant_api_secret')?.value
  
  // Check for Frappe session
  const frappeSession = request.cookies.get('sid')?.value
  
  // Must have at least one valid auth mechanism
  const hasNextAuthSession = !!nextAuthSession
  const hasTenantCredentials = !!(tenantApiKey && tenantApiSecret)
  const hasFrappeSession = !!frappeSession && frappeSession !== 'Guest'
  
  return hasNextAuthSession || hasTenantCredentials || hasFrappeSession
}

/**
 * Check if user has a tenant linked (for tenant-required routes)
 */
function getUserEmail(request: NextRequest): string | null {
  return request.cookies.get('user_email')?.value || 
         request.cookies.get('user_id')?.value || 
         null
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl
  
  // 1. TENANT DETECTION
  // ─────────────────────────────────────────────────────────────────────────
  const tenant = extractTenant(hostname)
  
  // 2. PUBLIC ROUTES - Allow through
  // ─────────────────────────────────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', tenant)
    return response
  }
  
  // 3. API ROUTES - Check auth for protected APIs
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Whitelisted API routes
    const publicApis = [
      '/api/auth/',
      '/api/provision/',
      '/api/provisioning-status',
      '/api/check-site-status',
    ]
    
    if (publicApis.some(api => pathname.startsWith(api))) {
      const response = NextResponse.next()
      response.headers.set('x-tenant-id', tenant)
      return response
    }
    
    // Protected API routes require auth
    if (!hasValidAuth(request)) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', tenant)
    return response
  }
  
  // 4. PROTECTED PAGE ROUTES - Enforce authentication
  // ─────────────────────────────────────────────────────────────────────────
  if (isProtectedRoute(pathname)) {
    if (!hasValidAuth(request)) {
      // Build redirect URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      loginUrl.searchParams.set('reason', 'unauthenticated')
      
      return NextResponse.redirect(loginUrl)
    }
    
    // User is authenticated - inject tenant context and allow through
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', tenant)
    
    // Pass user email for server-side role checks
    const userEmail = getUserEmail(request)
    if (userEmail) {
      response.headers.set('x-user-email', userEmail)
    }
    
    return response
  }
  
  // 5. ALL OTHER ROUTES - Pass through with tenant context
  // ─────────────────────────────────────────────────────────────────────────
  const response = NextResponse.next()
  response.headers.set('x-tenant-id', tenant)
  return response
}

// ============================================================================
// MATCHER CONFIG
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, fonts
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
