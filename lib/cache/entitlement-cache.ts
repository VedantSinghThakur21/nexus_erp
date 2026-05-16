import { createTtlMemoryCache } from '@/lib/performance/ttl-memory-cache'
import type { AgenticEntitlement } from '@/plugins/agentic-ai/types'

const ENTITLEMENT_TTL_MS = Number(process.env.ENTITLEMENT_CACHE_MS ?? '60000')
const cache = createTtlMemoryCache<AgenticEntitlement>()

export function getCachedEntitlement(tenantId: string): AgenticEntitlement | undefined {
  return cache.get(`entitlement:${tenantId}`)
}

export function setCachedEntitlement(tenantId: string, value: AgenticEntitlement): void {
  cache.set(`entitlement:${tenantId}`, value, ENTITLEMENT_TTL_MS)
}

export function invalidateEntitlementCache(tenantId: string): void {
  cache.delete(`entitlement:${tenantId}`)
}
