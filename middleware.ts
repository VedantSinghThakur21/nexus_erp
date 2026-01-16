import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Multi-Tenant Middleware
 * Extracts subdomain from hostname and passes it to the application via x-tenant-id header
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  
  // Extract subdomain from hostname
  const tenantId = extractTenantFromHost(host)
  
  // Clone the request headers and add tenant info
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenantId)
  
  // Log for debugging (remove in production)
  console.log('🔍 Middleware:', { host, tenantId })
  
  // Return response with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

/**
 * Extract tenant ID from hostname
 * Examples:
 *   - vfixit.avariq.in → vfixit
 *   - vfixit.localhost:3000 → vfixit
 *   - avariq.in → (empty - main domain)
 *   - www.avariq.in → (empty - www treated as main)
 *   - localhost:3000 → (empty - no subdomain)
 */
function extractTenantFromHost(host: string): string {
  // Remove port if present
  const hostname = host.split(':')[0]
  
  // Get base domain from environment (defaults)
  const baseDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'avariq.in'
  const isLocalhost = hostname.includes('localhost')
  
  if (isLocalhost) {
    // Handle localhost:3000 or vfixit.localhost:3000
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'localhost') {
      // vfixit.localhost → vfixit
      return parts[0]
    }
    // localhost → empty (main site)
    return ''
  }
  
  // Handle production domains (avariq.in, vfixit.avariq.in, www.avariq.in)
  const parts = hostname.split('.')
  
  // If hostname is exactly the base domain or www.basedomain → main site
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return ''
  }
  
  // If hostname is subdomain.basedomain → extract subdomain
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.replace(`.${baseDomain}`, '')
    // Ignore 'www' as a tenant
    return subdomain === 'www' ? '' : subdomain
  }
  
  // If hostname doesn't match pattern, treat as main site
  return ''
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
