'use client'

import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { useSubscription } from '@/lib/hooks/use-subscription'

const swrDefaults = {
  dedupingInterval: 60_000,
  revalidateOnFocus: false,
}

/** Mounts useSubscription once so SWR cache is warm for the app shell. */
function SubscriptionWarmPrefetch() {
  useSubscription()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrDefaults}>
      <SessionProvider>
        <SubscriptionWarmPrefetch />
        {children}
      </SessionProvider>
    </SWRConfig>
  )
}
