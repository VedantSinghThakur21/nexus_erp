/**
 * Coalesces concurrent identical async work (same key) into one in-flight Promise.
 * Use for hot paths where multiple components hit the same read in parallel.
 */

const inflight = new Map<string, Promise<unknown>>()

export async function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = inflight.get(key) as Promise<T> | undefined
  if (hit) return hit

  const promise = fn().finally(() => {
    inflight.delete(key)
  }) as Promise<T>

  inflight.set(key, promise)
  return promise
}
