/**
 * Coalesce identical in-flight GET Frappe calls (same site + endpoint + params + caller auth).
 * Per-process only; clears on deploy. Do not use for POST/mutations.
 */

import { createHash } from 'node:crypto'

const inFlight = new Map<string, Promise<unknown>>()

export function coalesceFrappeGet<T>(key: string, run: () => Promise<T>): Promise<T> {
  const hit = inFlight.get(key) as Promise<T> | undefined
  if (hit) return hit

  const promise = run().finally(() => {
    inFlight.delete(key)
  }) as Promise<T>

  inFlight.set(key, promise)
  return promise
}

function authFingerprint(context: {
  hasCredentials: boolean
  apiKey: string | null
  apiSecret: string | null
  sessionId: string | null
}): string {
  if (context.hasCredentials && context.apiKey && context.apiSecret) {
    return createHash('sha256')
      .update(`tok:${context.apiKey}:${context.apiSecret}`)
      .digest('hex')
      .slice(0, 32)
  }
  return createHash('sha256')
    .update(`sid:${context.sessionId ?? ''}`)
    .digest('hex')
    .slice(0, 32)
}

export function frappeGetCoalesceKey(
  siteName: string,
  endpoint: string,
  body: Record<string, unknown> | null,
  context: {
    hasCredentials: boolean
    apiKey: string | null
    apiSecret: string | null
    sessionId: string | null
  },
): string {
  const stable = body === null ? '{}' : JSON.stringify(body)
  return `${siteName}::${endpoint}::${stable}::${authFingerprint(context)}`
}
