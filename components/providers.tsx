'use client'

import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { UserProvider } from '@/contexts/user-context'

function SubscriptionWarmPrefetch() {
  useEffect(() => {
    void fetch('/api/subscription/current', { credentials: 'include' }).catch(() => undefined)
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <UserProvider>
                <SubscriptionWarmPrefetch />
                {children}
            </UserProvider>
        </SessionProvider>
    )
}
