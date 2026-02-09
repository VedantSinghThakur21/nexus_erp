
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const middleware = (request: NextRequest) => {
    // 1. Skip static assets and internal Next.js requests
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api/auth') || // Allow Auth.js routes
        request.nextUrl.pathname.includes('.') || // Skip files (favicon.ico, etc)
        request.nextUrl.pathname.startsWith('/static')
    ) {
        return NextResponse.next()
    }

    // 2. Get Host header
    const hostname = request.headers.get('host') || ''
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

    // 3. Extract Subdomain
    let currentHost = hostname.replace(`.${rootDomain}`, '')
    if (hostname.includes('localhost')) {
        const parts = hostname.split('.')
        if (parts.length > 1 && (parts[1].startsWith('localhost') || parts[1].includes('localhost'))) {
            currentHost = parts[0]
        } else {
            currentHost = 'master'
        }
    } else if (hostname === rootDomain) {
        currentHost = 'master'
    }

    // 4. Inject Tenant Header
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', currentHost)
    response.headers.set('x-current-path', request.nextUrl.pathname)
    response.headers.set('x-url', request.url)

    console.log(`[Middleware] Host: ${hostname} -> Tenant: ${currentHost}`)

    // 5. Auth Protection & Onboarding Enforcement
    // Note: Auth logic is handled in client-side middleware and route handlers
    // to avoid edge runtime issues with NextAuth configuration
    
    return response
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
