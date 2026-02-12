/**
 * Nexus ERP — Domain-Based Multi-Tenancy Middleware
 * ===================================================
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
 * Also:
 * - Blocks direct browser access to /site and /tenant paths
 * - Protects tenant routes (require credentials)
 * - Passes through static assets and API routes untouched
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

  // ── 1. Skip internal assets, API routes, and NextAuth ──
  // File extension check: matches paths ending with .ext (e.g., .png, .ico, .svg)
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    hasFileExtension // favicon, images, etc.
  ) {
    return NextResponse.next()
  }

  // ── 2. Block direct access to internal route groups ──
  if (pathname.startsWith('/site') || pathname.startsWith('/tenant')) {
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

  // ── 4. ROOT DOMAIN → rewrite to /site ──
  if (tenantSlug === null) {
    const siteUrl = new URL(`/site${pathname === '/' ? '' : pathname}`, request.url)
    siteUrl.search = request.nextUrl.search

    const response = NextResponse.rewrite(siteUrl)
    response.headers.set('x-tenant-id', 'master')
    response.headers.set('x-current-path', pathname)
    return response
  }

  // ── 5. TENANT SUBDOMAIN → rewrite to /tenant ──
  const tenantUrl = new URL(`/tenant${pathname === '/' ? '' : pathname}`, request.url)
  tenantUrl.search = request.nextUrl.search

  const response = NextResponse.rewrite(tenantUrl)
  response.headers.set('x-tenant-id', tenantSlug)
  response.headers.set('x-current-path', pathname)

  // ── 6. Tenant Auth Protection ──
  // Public tenant paths that don't require auth
  const publicTenantPaths = ['/login', '/signup', '/join', '/provisioning']
  const isPublicPath = publicTenantPaths.some(p => pathname.startsWith(p)) || pathname === '/'

  if (!isPublicPath) {
    const hasApiKey = request.cookies.get('tenant_api_key')?.value
    const hasSession =
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value
    const hasSid = request.cookies.get('sid')?.value

    if (!hasApiKey && !hasSession && !hasSid) {
      // No credentials → redirect to tenant login with returnTo parameter
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnTo', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
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
