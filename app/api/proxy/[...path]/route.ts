/**
 * CVE-1 Fix: Authenticated Frappe Proxy Route
 * ============================================
 *
 * This route acts as a secure server-side proxy between client JS and the
 * Frappe backend. It:
 *   1. Reads tenant_api_key / tenant_api_secret from httpOnly cookies (never exposed to JS)
 *   2. Reads the target tenant site from the x-tenant-id middleware header
 *   3. Forwards the request to Frappe with proper Authorization and X-Frappe-Site-Name headers
 *   4. Returns the Frappe response to the client
 *
 * Client code calls /api/proxy/<frappe-method> and never has access to raw credentials.
 */

import { cookies, headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const MASTER_SITE = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const PROXY_TIMEOUT_MS = Number(process.env.ERP_PROXY_TIMEOUT_MS || '15000')
const PROXY_LOG_THROTTLE_MS = Number(process.env.ERP_PROXY_LOG_THROTTLE_MS || '120000')
const proxyLogLastSeen = new Map<string, number>()

function shouldLogProxyError(key: string, throttleMs: number): boolean {
  const now = Date.now()
  const lastSeen = proxyLogLastSeen.get(key)
  if (lastSeen && now - lastSeen < throttleMs) {
    return false
  }
  proxyLogLastSeen.set(key, now)
  return true
}

function isTimeoutLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const cause = (error as Error & { cause?: { code?: string } }).cause
  const causeCode = cause?.code
  return (
    error.name === 'AbortError' ||
    error.message.includes('Headers Timeout Error') ||
    error.message.includes('UND_ERR_HEADERS_TIMEOUT') ||
    causeCode === 'UND_ERR_HEADERS_TIMEOUT'
  )
}

/**
 * Resolve the Frappe site name from the x-tenant-id middleware header.
 */
async function getSiteName(): Promise<string> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (tenantId && tenantId !== 'master') {
    return IS_PRODUCTION
      ? `${tenantId}.${ROOT_DOMAIN}`
      : `${tenantId}.localhost`
  }
  return MASTER_SITE
}

/**
 * Build the Authorization header from httpOnly cookies.
 * Falls back to master credentials for admin-context requests.
 * Returns null if no credentials are available (triggers 401).
 */
async function getAuthHeader(): Promise<string | null> {
  const cookieStore = await cookies()
  const apiKey = cookieStore.get('tenant_api_key')?.value
  const apiSecret = cookieStore.get('tenant_api_secret')?.value

  if (apiKey && apiSecret) {
    return `token ${apiKey}:${apiSecret}`
  }

  // Fallback: master credentials for root-domain admin users
  const masterKey = process.env.ERP_API_KEY
  const masterSecret = process.env.ERP_API_SECRET
  if (masterKey && masterSecret) {
    return `token ${masterKey}:${masterSecret}`
  }

  return null
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const frappePath = path.join('/')

  // Get credentials (server-side only — never exposed to client)
  const authHeader = await getAuthHeader()
  if (!authHeader) {
    return NextResponse.json(
      { message: 'Not authenticated' },
      { status: 401 }
    )
  }

  const siteName = await getSiteName()

  // Build the upstream Frappe URL
  const upstreamUrl = new URL(
    `/api/method/${frappePath}`,
    BASE_URL
  )

  // Forward query string (for GET requests)
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value)
  })

  // Forward request body for non-GET methods
  let body: string | undefined
  if (request.method !== 'GET') {
    try {
      body = await request.text()
    } catch {
      body = undefined
    }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)
    let upstreamResponse: Response
    try {
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader,
          'X-Frappe-Site-Name': siteName,
        },
        body: body || undefined,
        cache: 'no-store',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const responseData = await upstreamResponse.text()

    return new NextResponse(responseData, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    if (isTimeoutLikeError(error)) {
      const logKey = `timeout:${frappePath}`
      if (shouldLogProxyError(logKey, PROXY_LOG_THROTTLE_MS)) {
        console.error('[Proxy] Upstream request timeout:', { path: frappePath, timeoutMs: PROXY_TIMEOUT_MS })
      }
      return NextResponse.json(
        { message: `Proxy timeout after ${PROXY_TIMEOUT_MS}ms` },
        { status: 504 }
      )
    }

    const reason = error instanceof Error ? error.message : String(error)
    const logKey = `error:${frappePath}:${reason}`
    if (shouldLogProxyError(logKey, PROXY_LOG_THROTTLE_MS)) {
      console.error('[Proxy] Upstream Frappe request failed:', error)
    }
    return NextResponse.json(
      { message: 'Proxy error: could not reach Frappe backend' },
      { status: 502 }
    )
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
