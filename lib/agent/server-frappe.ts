import { cookies, headers } from 'next/headers'

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

export async function serverFrappeCall<T = unknown>(
  endpoint: string,
  method: FrappeMethod,
  payload?: Record<string, unknown>
): Promise<T> {
  const baseUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'

  const headerStore = await headers()
  const cookieStore = await cookies()

  const tenantId = headerStore.get('x-tenant-id') || 'master'
  const siteName = getSiteNameFromTenant(tenantId)

  const tenantApiKey = cookieStore.get('tenant_api_key')?.value
  const tenantApiSecret = cookieStore.get('tenant_api_secret')?.value
  const masterApiKey = process.env.ERP_API_KEY
  const masterApiSecret = process.env.ERP_API_SECRET

  const authHeader = tenantApiKey && tenantApiSecret
    ? `token ${tenantApiKey}:${tenantApiSecret}`
    : masterApiKey && masterApiSecret
      ? `token ${masterApiKey}:${masterApiSecret}`
      : ''

  const url = new URL(`${baseUrl}/api/method/${endpoint}`)

  if (method === 'GET' && payload) {
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'X-Frappe-Site-Name': siteName,
    },
    body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => ({}))) as FrappeEnvelope<T> & Record<string, unknown>

  if (!response.ok) {
    throw new ServerFrappeError(response.status, parseErrorMessage(data, response.status), data)
  }

  return (data.message ?? data.data ?? data) as T
}

export function isMissingAgentActionLogError(error: unknown): boolean {
  if (!(error instanceof ServerFrappeError)) return false

  const serverMessages = typeof error.data._server_messages === 'string'
    ? error.data._server_messages
    : ''

  return (
    error.status === 404 &&
    (
      error.message.includes('DocType Agent Action Log not found') ||
      serverMessages.includes('DocType Agent Action Log not found')
    )
  )
}
