'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export function TenantGuard({ children, hasApiKey }: { children: React.ReactNode, hasApiKey?: boolean }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (status === 'loading') return

        // If authenticated but tenant API key is missing from cookies → expired/missing session → force re-login
        if (status === 'authenticated' && hasApiKey === false) {
            if (!pathname?.startsWith('/login') && !pathname?.startsWith('/onboarding')) {
                console.warn('[TenantGuard] Tenant API key missing for authenticated user — redirecting to login.')
                router.replace('/login?reason=session_expired')
            }
            return
        }

        // If authenticated via NextAuth but no tenant linked in session,
        // check if they have a valid API key (from email/password login).
        // The hasApiKey prop comes from the server component (reads HttpOnly cookie).
        if (status === 'authenticated' && !session?.hasTenant && !hasApiKey) {
            if (!pathname?.startsWith('/onboarding')) {
                router.replace('/onboarding')
            }
        }
    }, [status, session, router, pathname, hasApiKey])

    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return <>{children}</>
}
