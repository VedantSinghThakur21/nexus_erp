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
  const tenant = extractTenantFromHostname(hostname)
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/api', '/', '/contact', '/demo']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('sid')
  const hasSession = !!sessionCookie
  
  // Create response
  let response: NextResponse
  
  // Allow access to public routes
  if (isPublicRoute) {
    response = NextResponse.next()
  }
  // Redirect to login if not authenticated
  else if (!hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    response = NextResponse.redirect(loginUrl)
  }
  // Redirect to dashboard if accessing login with active session
  else if (pathname === '/login' && hasSession) {
    const dashboardUrl = new URL('/dashboard', request.url)
    response = NextResponse.redirect(dashboardUrl)
  }
  // Authenticated user - allow access
  else {
    response = NextResponse.next()
  }
  
  // Inject tenant into request headers for server components
  response.headers.set('x-tenant', tenant)
  
  return response
}

/**
 * Extracts tenant identifier from hostname
 * Supports:
 * - tenant1.localhost -> "tenant1"
 * - tenant2.example.com -> "tenant2"
 * - localhost -> "default"
 * - example.com -> "default"
 */
function extractTenantFromHostname(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Split by dots
  const parts = host.split('.')
  
  // If it's a subdomain (more than 2 parts, or localhost with subdomain)
  if (parts.length >= 2) {
    // Check if it's subdomain.localhost
    if (parts[parts.length - 1] === 'localhost' && parts.length > 1) {
      return parts[0] // Return subdomain
    }
    // Check if it's subdomain.domain.com
    if (parts.length > 2) {
      return parts[0] // Return subdomain
    }
  }
  
  // Default tenant for localhost or apex domain
  return 'default'
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
