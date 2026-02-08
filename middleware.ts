
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './auth'

export const middleware = auth((request) => {
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
    // @ts-ignore
    const user = request.auth?.user
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup')
    const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding')
    const isPublicRoute = request.nextUrl.pathname === '/' || isAuthRoute

    if (user && !isPublicRoute) {
        // If user is logged in but has NO tenant, force them to onboarding
        // @ts-ignore
        if (!user.hasTenant && !isOnboardingRoute) {
            const onboardingUrl = new URL('/onboarding', request.url)
            return NextResponse.redirect(onboardingUrl)
        }

        // If user HAS tenant and is on onboarding, redirect to dashboard?
        // Maybe let them stay if they want to create another org? 
        // For now, let's keep it simple.
    }

    return response
})

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
