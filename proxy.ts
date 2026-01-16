import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * DNS-Based Multi-Tenant Proxy (Next.js 16+)
 * - Extracts tenant from hostname (subdomain)
 * - Injects tenant into request headers (x-tenant)
 * - Handles authentication (redirect to /login if not authenticated)
 * - Supports local development (tenant1.localhost, tenant2.localhost)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  
  // Extract tenant from hostname
  const tenantId = extractTenantFromHostname(hostname)
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/api', '/', '/contact', '/demo']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('sid')
  const hasSession = !!sessionCookie
  
  // Clone request headers to add tenant info
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenantId)
  
  // Create response
  let response: NextResponse
  
  // Allow access to public routes
  if (isPublicRoute) {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  // Redirect to login if not authenticated
  else if (!hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    response = NextResponse.redirect(loginUrl)
    response.headers.set('x-tenant-id', tenantId)
  }
  // Redirect to dashboard if accessing login with active session
  else if (pathname === '/login' && hasSession) {
    const dashboardUrl = new URL('/dashboard', request.url)
    response = NextResponse.redirect(dashboardUrl)
    response.headers.set('x-tenant-id', tenantId)
  }
  // Authenticated user - allow access
  else {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  return response
}

/**
 * Extracts tenant identifier from hostname
 * Supports:
 * - vfixit.avariq.in -> "vfixit"
 * - vfixit.localhost -> "vfixit"
 * - localhost -> ""
 * - avariq.in -> ""
 * - www.avariq.in -> ""
 */
function extractTenantFromHostname(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Get base domain from environment
  const baseDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  
  // Handle localhost development
  if (host.includes('localhost')) {
    const parts = host.split('.')
    // vfixit.localhost -> "vfixit"
    if (parts.length > 1 && parts[0] !== 'localhost') {
      return parts[0]
    }
    // localhost -> ""
    return ''
  }
  
  // Handle production domains
  // Ignore root domain and www subdomain
  if (host === baseDomain || host === `www.${baseDomain}`) {
    return ''
  }
  
  // Extract subdomain from vfixit.avariq.in -> "vfixit"
  if (host.endsWith(`.${baseDomain}`)) {
    const subdomain = host.replace(`.${baseDomain}`, '')
    // Ignore 'www' as a tenant
    return subdomain === 'www' ? '' : subdomain
  }
  
  // Default: no tenant
  return ''
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
