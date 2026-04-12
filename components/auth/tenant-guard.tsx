'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * TenantGuard - Client-side Authentication Guard
 * 
 * Acts as a fallback layer after middleware protection.
 * Handles edge cases like expired sessions and missing credentials.
 * 
 * The primary protection is in middleware.ts (server-side).
 * This component handles client-side session state changes.
 */
export function TenantGuard({ children, hasServerAuth }: { children: React.ReactNode, hasServerAuth?: boolean }) {
    const { status } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (status === 'loading') return

        const isPublicRoute = 
            pathname?.startsWith('/login') || 
            pathname?.startsWith('/signup') ||
            pathname?.startsWith('/onboarding') ||
            pathname?.startsWith('/provisioning-status') ||
            pathname?.startsWith('/auth/')

        // Skip checks for public routes
        if (isPublicRoute) return

        // Server layout already validated auth via cookies (API key/SID/user/email or NextAuth).
        // Do not let NextAuth's unauthenticated state override the credential-based login flow.
        if (hasServerAuth) return

        // If tenant API key is missing but user is authenticated → session issue
        if (status === 'authenticated' && hasServerAuth === false) {
            console.warn('[TenantGuard] Server auth cookies missing — redirecting to login.')
            router.replace('/login?reason=session_expired')
            return
        }

        // If unauthenticated and not on a public route → redirect to login
        if (status === 'unauthenticated' && !isPublicRoute) {
            router.replace(`/login?callbackUrl=${encodeURIComponent(pathname || '/')}&reason=unauthenticated`)
            return
        }
    }, [status, router, pathname, hasServerAuth])

    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return <>{children}</>
}
