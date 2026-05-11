/**
 * Tiny per-process TTL cache for org metadata, entitlement hints, etc.
 * (Layer 1 — in-memory; cleared on deploy / cold start.)
 */

type Entry<T> = { value: T; expiresAt: number }

export function createTtlMemoryCache<T>() {
  const map = new Map<string, Entry<T>>()

  return {
    get(key: string): T | undefined {
      const entry = map.get(key)
      if (!entry) return undefined
      if (Date.now() > entry.expiresAt) {
        map.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key: string, value: T, ttlMs: number): void {
      map.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
    delete(key: string): void {
      map.delete(key)
    },
  }
}
