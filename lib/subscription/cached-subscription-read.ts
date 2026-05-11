import { unstable_cache } from 'next/cache'
import { getOrganizationBySlug, getSaasTenantBySubdomain } from '@/lib/subscription/master'
import {
  normalizePlan,
  normalizeSubscriptionStatus,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/types/subscription'

export type CachedSubscriptionRead =
  | { found: false }
  | {
      found: true
      tenant: NonNullable<Awaited<ReturnType<typeof getSaasTenantBySubdomain>>>
      synced: {
        plan: SubscriptionTier
        status: SubscriptionStatus
        organization: Awaited<ReturnType<typeof getOrganizationBySlug>>
      }
    }

/**
 * Layer 2 — Next Data Cache: ~60s snapshot per tenant.
 * Read-only (no mirror writes): SaaS Tenant + Organization in parallel.
 * Tag `subscription:{tenantId}` — invalidate via revalidateTag after sync/webhook/CLI flows
 * that change Frappe; POST /api/subscription/sync calls revalidateTag.
 */
export function getCachedSubscriptionRead(tenantId: string): Promise<CachedSubscriptionRead> {
  return unstable_cache(
    async (): Promise<CachedSubscriptionRead> => {
      const [tenant, organization] = await Promise.all([
        getSaasTenantBySubdomain(tenantId),
        getOrganizationBySlug(tenantId),
      ])
      if (!tenant) return { found: false }

      const plan = normalizePlan(tenant.plan_type ?? organization?.subscription_plan)
      const status = normalizeSubscriptionStatus(
        tenant.subscription_status || tenant.status || organization?.subscription_status || 'active'
      )

      return {
        found: true,
        tenant,
        synced: { plan, status, organization },
      }
    },
    ['subscription-read-v2', tenantId],
    { revalidate: 60, tags: [`subscription:${tenantId}`] }
  )()
}
