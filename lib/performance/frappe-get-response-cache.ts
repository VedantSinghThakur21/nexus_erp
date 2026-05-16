/**
 * Short TTL cache for successful Frappe GET responses (Layer 1 memory + optional Redis).
 * Complements in-flight coalescing. Disabled when FRAPPE_GET_CACHE_MS=0.
 */

import { createTtlMemoryCache } from '@/lib/performance/ttl-memory-cache'
import { readRedisFrappeGet, writeRedisFrappeGet } from '@/lib/performance/frappe-get-redis-cache'

const DEFAULT_TTL_MS = Number(process.env.FRAPPE_GET_CACHE_MS ?? '30000')

const store = createTtlMemoryCache<unknown>()

export async function readFrappeGetCache(key: string): Promise<unknown | undefined> {
  if (DEFAULT_TTL_MS <= 0) return undefined

  const memory = store.get(key)
  if (memory !== undefined) return memory

  const redis = await readRedisFrappeGet(key)
  if (redis !== undefined) {
    store.set(key, redis, DEFAULT_TTL_MS)
    return redis
  }

  return undefined
}

export async function writeFrappeGetCache(key: string, value: unknown): Promise<void> {
  if (DEFAULT_TTL_MS <= 0) return
  store.set(key, value, DEFAULT_TTL_MS)
  await writeRedisFrappeGet(key, value, DEFAULT_TTL_MS)
}
