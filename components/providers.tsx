'use client'

import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { UserProvider } from '@/contexts/user-context'

function SubscriptionWarmPrefetch() {
  useEffect(() => {
    void Promise.all([
      fetch('/api/subscription/current', { credentials: 'include' }),
      fetch('/api/agentic/entitlement', { credentials: 'include' }),
    ]).catch(() => undefined)
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
