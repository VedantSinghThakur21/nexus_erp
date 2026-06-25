'use client'

import { useCallback } from 'react'
import useSWR from 'swr'

export const SUBSCRIPTION_CURRENT_KEY = '/api/subscription/current'
export const AGENTIC_ENTITLEMENT_KEY = '/api/agentic/entitlement'

const STALE_MS = 60_000

export type SubscriptionCurrent = {
  plan?: string
  status?: string
  source?: string
  tenant?: unknown
}

export type AgenticEntitlement = {
  allowed?: boolean
  plan?: string
  tenantId?: string
  flags?: Record<string, boolean>
  enabledTools?: string[]
  lockedTools?: Array<{ name: string; requiredPlan?: string; requiredFlag?: string }>
}

const swrOptions = {
  dedupingInterval: STALE_MS,
  revalidateOnFocus: false,
}

async function fetchSubscription<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${response.status}`)
  }
  return data
}

async function fetchEntitlement(url: string): Promise<AgenticEntitlement> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' })
  const data = (await response.json().catch(() => ({}))) as AgenticEntitlement
  if (response.ok) return data
  return { ...data, allowed: false }
}

/**
 * Shared subscription + agentic entitlement state.
 * SWR dedupes in-flight requests across components for 60s.
 */
export function useSubscription() {
  const {
    data: subscription,
    error: subscriptionError,
    isLoading: subscriptionLoading,
    mutate: mutateSubscription,
  } = useSWR<SubscriptionCurrent>(SUBSCRIPTION_CURRENT_KEY, fetchSubscription, swrOptions)

  const {
    data: entitlement,
    error: entitlementError,
    isLoading: entitlementLoading,
    mutate: mutateEntitlement,
  } = useSWR<AgenticEntitlement>(AGENTIC_ENTITLEMENT_KEY, fetchEntitlement, swrOptions)

  const refresh = useCallback(async () => {
    await Promise.all([mutateSubscription(), mutateEntitlement()])
  }, [mutateSubscription, mutateEntitlement])

  return {
    subscription,
    entitlement,
    plan: subscription?.plan ?? 'free',
    agenticAllowed: Boolean(entitlement?.allowed),
    isLoading: subscriptionLoading || entitlementLoading,
    error: subscriptionError ?? entitlementError ?? null,
    refresh,
  }
}
