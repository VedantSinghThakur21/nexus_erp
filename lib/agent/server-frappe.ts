import { cookies, headers } from 'next/headers'
import { frappeEffectiveBaseUrl, frappeSiteRequestHeaders } from '@/lib/frappe-site-headers'

type FrappeMethod = 'GET' | 'POST'

type FrappeEnvelope<T> = {
  message?: T
  data?: T
  exc_type?: string
  _server_messages?: string
}

export class ServerFrappeError extends Error {
  status: number
  data: Record<string, unknown>

  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ServerFrappeError'
    this.status = status
    this.data = data
  }
}

function getSiteNameFromTenant(tenantId: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  const isProd = process.env.NODE_ENV === 'production'
  const master = process.env.FRAPPE_SITE_NAME || 'erp.localhost'

  if (!tenantId || tenantId === 'master') return master
  return isProd ? `${tenantId}.${rootDomain}` : `${tenantId}.localhost`
}

function parseErrorMessage(data: Record<string, unknown>, status: number): string {
  if (typeof data.message === 'string' && data.message) return data.message

  if (typeof data._server_messages === 'string' && data._server_messages) {
    return data._server_messages
  }

  return `Frappe request failed with status ${status}`
}

async function doFrappeRequest<T>(
  url: URL,
  method: FrappeMethod,
  payload: Record<string, unknown> | undefined,
  siteName: string,
  authHeader?: string,
  sid?: string
): Promise<{ response: Response; data: FrappeEnvelope<T> & Record<string, unknown> }> {
  const configuredBase = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  const frappeBase = frappeEffectiveBaseUrl(siteName, configuredBase)
  const requestHeaders: Record<string, string> = frappeSiteRequestHeaders(siteName, frappeBase, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  })

  if (authHeader) {
    requestHeaders['Authorization'] = authHeader
  }

  if (sid) {
    requestHeaders['Cookie'] = `sid=${sid}`
  }

  const response = await fetch(url.toString(), {
    method,
    headers: requestHeaders,
    body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => ({}))) as FrappeEnvelope<T> & Record<string, unknown>
  return { response, data }
}

export async function serverFrappeCall<T = unknown>(
  endpoint: string,
  method: FrappeMethod,
  payload?: Record<string, unknown>
): Promise<T> {
  const configuredBase = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'

  const headerStore = await headers()
  const cookieStore = await cookies()

  const tenantId = headerStore.get('x-tenant-id') || 'master'
  const siteName = getSiteNameFromTenant(tenantId)

  const tenantApiKey = cookieStore.get('tenant_api_key')?.value
  const tenantApiSecret = cookieStore.get('tenant_api_secret')?.value
  const sid = cookieStore.get('sid')?.value
  const masterApiKey = process.env.ERP_API_KEY
  const masterApiSecret = process.env.ERP_API_SECRET

  const authHeader = tenantApiKey && tenantApiSecret
    ? `token ${tenantApiKey}:${tenantApiSecret}`
    : masterApiKey && masterApiSecret
      ? `token ${masterApiKey}:${masterApiSecret}`
      : undefined

  const frappeBase = frappeEffectiveBaseUrl(siteName, configuredBase)
  const url = new URL(`${frappeBase}/api/method/${endpoint}`)

  if (method === 'GET' && payload) {
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
  }

  let { response, data } = await doFrappeRequest<T>(url, method, payload, siteName, authHeader, sid)

  // Tenant tokens can be stale or scoped too narrowly for some doctypes.
  // Retry once with pure session auth before failing.
  if (!response.ok && (response.status === 401 || response.status === 403) && authHeader && sid) {
    const fallback = await doFrappeRequest<T>(url, method, payload, siteName, undefined, sid)
    response = fallback.response
    data = fallback.data
  }

  if (!response.ok) {
    throw new ServerFrappeError(response.status, parseErrorMessage(data, response.status), data)
  }

  return (data.message ?? data.data ?? data) as T
}

/** Collect all human-readable fragments Frappe may put on an error (message, _server_messages JSON array, nested JSON). */
function collectFrappeErrorBlob(err: ServerFrappeError): string {
  const chunks: string[] = [err.message, String(err.data.exception || ''), String(err.data.exc_type || '')]
  const sm = err.data._server_messages
  if (typeof sm === 'string') {
    chunks.push(sm)
    try {
      const parsed = JSON.parse(sm) as unknown
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') {
            chunks.push(item)
            try {
              const inner = JSON.parse(item) as { message?: string }
              if (typeof inner?.message === 'string') chunks.push(inner.message)
            } catch {
              /* item was plain text */
            }
          }
        }
      }
    } catch {
      /* sm not JSON */
    }
  }
  return chunks.join(' ')
}

/** DocType missing, renamed, or not migrated on this tenant site — not always HTTP 404. */
export function isAgentActionLogUnavailableError(error: unknown): boolean {
  if (error instanceof ServerFrappeError) {
    const blob = collectFrappeErrorBlob(error).toLowerCase()
    if (blob.includes('doctype agent action log not found')) return true
    if (blob.includes('agent action log') && blob.includes('not found')) return true
    if (
      error.status === 403 &&
      blob.includes('agent action log') &&
      (blob.includes('permission') || blob.includes('not permitted') || blob.includes('permissionerror'))
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const m = error.message.toLowerCase()
    if (m.includes('doctype agent action log not found')) return true
    if (m.includes('agent action log') && m.includes('not found')) return true
  }
  return false
}

/** @deprecated use isAgentActionLogUnavailableError */
export function isMissingAgentActionLogError(error: unknown): boolean {
  return isAgentActionLogUnavailableError(error)
}
