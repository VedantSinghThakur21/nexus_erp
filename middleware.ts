import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/api']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Setup route (one-time admin setup)
  if (pathname === '/setup') {
    return NextResponse.next()
  }
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('sid')
  const hasSession = !!sessionCookie
  
  // Redirect to login if accessing protected route without session
  if (!isPublicRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Redirect to dashboard if accessing login with active session
  if (pathname === '/login' && hasSession) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}
