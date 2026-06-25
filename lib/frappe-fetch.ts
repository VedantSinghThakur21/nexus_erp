/**
 * Persistent HTTP connections to Frappe/ERPNext on the same private VM.
 * Node's default fetch opens a new TCP socket per request; undici Agent reuses
 * connections and typically saves 50–150ms per hop on co-located deployments.
 */

import { Agent } from 'undici'

const FRAPPE_CONNECTIONS = Number(process.env.FRAPPE_HTTP_CONNECTIONS || '10')

const frappeAgent = new Agent({
  connections: FRAPPE_CONNECTIONS,
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
})

type FrappeFetchInit = RequestInit & {
  dispatcher?: unknown
}

/**
 * fetch() with keep-alive dispatcher for Frappe/ERP URLs.
 * Pass an AbortSignal via `signal` for per-request timeouts.
 */
export function frappeFetch(
  url: string | URL,
  init?: FrappeFetchInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    dispatcher: frappeAgent,
  } as RequestInit)
}

/** Optional timing logs when FRAPPE_TIMING=1 */
export async function frappeFetchTimed(
  label: string,
  url: string | URL,
  init?: FrappeFetchInit,
): Promise<Response> {
  const start = Date.now()
  const response = await frappeFetch(url, init)
  if (process.env.FRAPPE_TIMING === '1') {
    const method = init?.method || 'GET'
    console.log(`[frappe] ${method} ${label} ${Date.now() - start}ms`)
  }
  return response
}
