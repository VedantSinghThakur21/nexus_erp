/**
 * Nexus ERP — Domain-Based Multi-Tenancy Middleware
 * ===================================================
 *
 * ROUTING:
 * ┌─────────────────────────┬───────────────────────────────────┐
 * │ Hostname                │ Rewrite Target                    │
 * ├─────────────────────────┼───────────────────────────────────┤
 * │ avariq.in (root)        │ /app/_site/*                      │
 * │ tesla.avariq.in (tenant)│ /app/_tenant/* + x-tenant-id hdr  │
 * │ localhost:3000           │ /app/_site/* (dev root)           │
 * │ tesla.localhost:3000     │ /app/_tenant/* (dev tenant)       │
 * └─────────────────────────┴───────────────────────────────────┘
 *
 * Also:
 * - Blocks direct browser access to /_site and /_tenant paths
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
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // favicon, images, etc.
  ) {
    return NextResponse.next()
  }

  // ── 2. Block direct access to internal route groups ──
  if (pathname.startsWith('/_site') || pathname.startsWith('/_tenant')) {
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

  // ── 4. ROOT DOMAIN → rewrite to /_site ──
  if (tenantSlug === null) {
    const siteUrl = new URL(`/_site${pathname === '/' ? '' : pathname}`, request.url)
    siteUrl.search = request.nextUrl.search

    const response = NextResponse.rewrite(siteUrl)
    response.headers.set('x-tenant-id', 'master')
    response.headers.set('x-current-path', pathname)
    return response
  }

  // ── 5. TENANT SUBDOMAIN → rewrite to /_tenant ──
  const tenantUrl = new URL(`/_tenant${pathname === '/' ? '' : pathname}`, request.url)
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
      // No credentials → redirect to tenant login
      const loginUrl = new URL('/login', request.url)
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
