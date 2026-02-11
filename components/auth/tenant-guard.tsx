'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export function TenantGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (status === 'loading') return

        // If authenticated but no tenant, and not already on onboarding page
        // CRITICAL: Also check if they have a tenant_api_key cookie (email login)
        // because NextAuth session might be stale or from a Google login without tenant linkage yet.
        const hasApiKey = document.cookie.includes('tenant_api_key')

        if (status === 'authenticated' && !session?.hasTenant && !hasApiKey) {
            // We also avoid redirecting if on specific onboarding/signup/api pages to prevent loops
            // But TenantGuard is intended for (main)/layout, which covers dashboard/crm/etc.
            // Onboarding is at root logic /app/onboarding.
            // Just in case (main) includes unknown logic, we check pathname.
            if (!pathname?.startsWith('/onboarding')) {
                router.replace('/onboarding')
            }
        }
    }, [status, session, router, pathname])

    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // If no tenant, we shouldn't show dashboard content (flicker protection)
    // If no tenant, we shouldn't show dashboard content (flicker protection)
    // BUT we must allow render if they have an API key (handled by check above)
    // so we don't return null here aggressively.
    // Instead rely on the useEffect to redirect if needed.

    return <>{children}</>

    return <>{children}</>
}
