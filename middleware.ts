import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Extract subdomain from hostname
 * Examples:
 *   acme.nexuserp.com -> acme
 *   localhost:3000 -> null
 *   nexuserp.com -> null
 */
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // For localhost or IPs, no subdomain
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null
  }
  
  const parts = host.split('.')
  
  // Need at least 3 parts for subdomain (sub.domain.com)
  if (parts.length < 3) {
    return null
  }
  
  // First part is the subdomain
  return parts[0]
}

/**
 * Fetch tenant configuration from master database
 */
async function getTenantConfig(subdomain: string) {
  try {
    const masterUrl = process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080'
    const apiKey = process.env.ERP_API_KEY
    const apiSecret = process.env.ERP_API_SECRET
    
    const response = await fetch(`${masterUrl}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`
      },
      body: JSON.stringify({
        doctype: 'Tenant',
        filters: { subdomain },
        fields: ['site_url', 'status', 'plan', 'site_config'],
        limit_page_length: 1
      })
    })
    
    if (!response.ok) {
      return null
    }
    
    const result = await response.json()
    if (result.message && result.message.length > 0) {
      return result.message[0]
    }
    
    return null
  } catch (error) {
    console.error('Failed to fetch tenant config:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  
  // Extract subdomain
  const subdomain = getSubdomain(hostname)
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/api', '/setup']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('sid')
  const hasSession = !!sessionCookie
  
  // Setup route (one-time admin setup) - always use master site
  if (pathname === '/setup') {
    const response = NextResponse.next()
    response.headers.set('X-ERPNext-URL', process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080')
    response.headers.set('X-Tenant-Mode', 'master')
    return response
  }
  
  // Handle subdomain routing
  let erpnextUrl = process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080'
  let tenantMode = 'master'
  
  if (subdomain) {
    // Fetch tenant configuration
    const tenant = await getTenantConfig(subdomain)
    
    if (tenant) {
      if (tenant.status !== 'active' && tenant.status !== 'trial') {
        // Tenant is suspended or cancelled
        const suspendedUrl = new URL('/suspended', request.url)
        return NextResponse.redirect(suspendedUrl)
      }
      
      // Use tenant's ERPNext site URL
      erpnextUrl = tenant.site_url
      tenantMode = 'tenant'
      
      // Parse site_config if it's a JSON string
      let siteConfig = tenant.site_config
      if (typeof siteConfig === 'string') {
        try {
          siteConfig = JSON.parse(siteConfig)
        } catch (e) {
          console.error('Failed to parse site_config:', e)
        }
      }
    } else {
      // Subdomain not found - show not found page
      const notFoundUrl = new URL('/tenant-not-found', request.url)
      return NextResponse.redirect(notFoundUrl)
    }
  }
  
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
  
  // Add headers for API routing
  const response = NextResponse.next()
  response.headers.set('X-ERPNext-URL', erpnextUrl)
  response.headers.set('X-Tenant-Mode', tenantMode)
  response.headers.set('X-Subdomain', subdomain || '')
  
  return response
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
