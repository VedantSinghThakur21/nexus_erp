/**
 * Map async work over `items` with at most `concurrency` in-flight promises.
 * Avoids opening N simultaneous network calls (e.g. role lookups per team member).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const results: R[] = new Array(items.length)
  let next = 0
  const limit = Math.max(1, Math.min(concurrency, items.length))

  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}
