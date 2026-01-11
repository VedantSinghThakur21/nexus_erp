import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Simple Single-Tenant Middleware
 * - Handles authentication (redirect to /login if not authenticated)
 * - No subdomain routing
 * - No dynamic tenant switching
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/api', '/', '/contact', '/demo']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('sid')
  const hasSession = !!sessionCookie
  
  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Redirect to login if not authenticated
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Redirect to dashboard if accessing login with active session
  if (pathname === '/login' && hasSession) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }
  
  // Authenticated user - allow access
  return NextResponse.next()
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
