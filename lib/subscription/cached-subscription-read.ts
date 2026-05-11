import { unstable_cache } from 'next/cache'
import { getSaasTenantBySubdomain, syncSubscriptionFromSaasTenant } from '@/lib/subscription/master'

export type CachedSubscriptionRead =
  | { found: false }
  | {
      found: true
      tenant: NonNullable<Awaited<ReturnType<typeof getSaasTenantBySubdomain>>>
      synced: Awaited<ReturnType<typeof syncSubscriptionFromSaasTenant>>
    }

/**
 * Layer 2 — Next Data Cache: ~60s snapshot per tenant.
 * Tag: `subscription:{tenantId}` for revalidateTag() after billing webhooks or Frappe writes.
 */
export function getCachedSubscriptionRead(tenantId: string): Promise<CachedSubscriptionRead> {
  return unstable_cache(
    async (): Promise<CachedSubscriptionRead> => {
      const tenant = await getSaasTenantBySubdomain(tenantId)
      if (!tenant) return { found: false }

      const synced = await syncSubscriptionFromSaasTenant({
        subdomain: tenantId,
        source: 'saas_tenant',
        changedBy: 'subscription_api_cache',
        reason: 'subscription_current_read_cached',
      })

      return { found: true, tenant, synced }
    },
    ['subscription-read-v1', tenantId],
    { revalidate: 60, tags: [`subscription:${tenantId}`] }
  )()
}
