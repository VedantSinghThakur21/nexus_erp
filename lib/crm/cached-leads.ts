import { revalidateTag, unstable_cache } from 'next/cache'
import { getLeads } from '@/app/actions/crm'
import { getTenantContext } from '@/app/lib/api'

export async function revalidateLeadsListCache() {
  const { siteName } = await getTenantContext()
  revalidateTag(`crm:leads:${siteName}`, 'max')
}

/**
 * Layer 2 — cached lead list per tenant site (30s).
 * Invalidate with `revalidateTag(\`crm:leads:${tenantSite}\`)` after lead mutations.
 */
export async function getCachedLeads() {
  const { siteName } = await getTenantContext()
  return unstable_cache(
    async () => getLeads(),
    ['crm-leads-list-v1', siteName],
    { revalidate: 30, tags: [`crm:leads:${siteName}`] },
  )()
}
