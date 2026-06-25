import { cache as reactCache } from 'react'
import { revalidateTag } from 'next/cache'
import { getLeads } from '@/app/actions/crm'
import { getTenantContext } from '@/app/lib/api'

export async function revalidateLeadsListCache() {
  const { siteName } = await getTenantContext()
  revalidateTag(`crm:leads:${siteName}`, 'max')
}

/**
 * Per-request dedupe for lead list (react cache).
 * Cannot use unstable_cache here — getLeads → frappeRequest reads cookies().
 */
const getLeadsForRequest = reactCache(async () => getLeads())

export async function getCachedLeads() {
  return getLeadsForRequest()
}
