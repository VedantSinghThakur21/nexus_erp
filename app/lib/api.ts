import { cookies, headers } from 'next/headers'
import { coalesceFrappeGet, frappeGetCoalesceKey } from '@/lib/performance/frappe-get-coalesce'
import { verifyTenantApiToken } from '@/lib/verify-tenant-api-token'
import { mintTenantApiKeysViaSession } from '@/lib/mint-tenant-api-keys'
import {
  readFrappeGetCache,
  writeFrappeGetCache,
} from '@/lib/performance/frappe-get-response-cache'
import { frappeEffectiveBaseUrl, frappeSiteRequestHeaders } from '@/lib/frappe-site-headers'
import { parseTenantSubdomainFromHost } from '@/lib/tenant'
import { cache as reactCache } from 'react'

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const MASTER_API_KEY = process.env.ERP_API_KEY
const MASTER_API_SECRET = process.env.ERP_API_SECRET
const MASTER_SITE_NAME = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const REQUEST_TIMEOUT_MS = Number(process.env.ERP_REQUEST_TIMEOUT_MS || '15000')
const DEFAULT_ERROR_LOG_THROTTLE_MS = Number(process.env.ERP_ERROR_LOG_THROTTLE_MS || '120000')
const AUTH_ERROR_LOG_THROTTLE_MS = Number(process.env.ERP_AUTH_ERROR_LOG_THROTTLE_MS || '600000')

// ============================================================================
// TYPES
// ============================================================================

interface TenantContext {
  isTenant: boolean
  subdomain: string | null
  siteName: string
  apiKey: string | null
  apiSecret: string | null
  hasCredentials: boolean
  /** Frappe `sid` when present — avoids a second `cookies()` read in hot paths */
  sessionId: string | null
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | null
  useMasterCredentials?: boolean // Force use of master credentials
  useSessionAuth?: boolean // Force session cookie auth (no Authorization header)
  siteOverride?: string // Override the target site name (use with useMasterCredentials for tenant admin ops)
  hasRoleRepairAttempted?: boolean
  hasSessionFallbackAttempted?: boolean
  hasTenantTokenRetryAttempted?: boolean
}

const ROLE_REPAIR_COOLDOWN_MS = 10 * 60 * 1000
const DOCPERM_REPAIR_COOLDOWN_MS = 10 * 60 * 1000
/** Concurrent 403s within this window reuse the last repair and retry */
const REPAIR_RETRY_WINDOW_MS = 30 * 1000
const DOCPERM_REPAIR_COOKIE = 'tenant_docperm_repaired'
const roleRepairLastAttempt = new Map<string, number>()
const docpermRepairLastAttempt = new Map<string, number>()
const roleRepairInFlight = new Map<string, Promise<boolean>>()
const docpermRepairInFlight = new Map<string, Promise<boolean>>()
const apiErrorLogLastSeen = new Map<string, number>()
const tenantKeySyncInFlight = new Map<string, Promise<TenantContext | null>>()
const tenantKeySyncCache = new Map<string, { apiKey: string; apiSecret: string; at: number }>()
const TENANT_KEY_SYNC_CACHE_MS = 60_000

function shouldEmitThrottledLog(key: string, throttleMs: number): boolean {
  const now = Date.now()
  const lastSeen = apiErrorLogLastSeen.get(key)
  if (lastSeen && now - lastSeen < throttleMs) {
    return false
  }
  apiErrorLogLastSeen.set(key, now)
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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  // Respect externally provided signals if present.
  if (options.signal) {
    return fetch(url, options)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function parseResponseData(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return { message: 'Invalid JSON response from ERP backend' }
    }
  }

  const text = await response.text()
  return { message: text || `Request failed with status ${response.status}` }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Read tenant context from cookies and headers
 * Returns comprehensive tenant information for API routing
 */
/**
 * Read tenant context from headers (injected by middleware)
 * Returns comprehensive tenant information for API routing
 */
async function resolveTenantContext(): Promise<TenantContext> {
  try {
    const [headersList, cookieStore] = await Promise.all([headers(), cookies()])

    // 1. Get Tenant ID from Middleware Header (Source of Truth), with Host fallback
    const headerTenantId = headersList.get('x-tenant-id')
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
    const hostTenantId = parseTenantSubdomainFromHost(host)
    const cookieSubdomain = cookieStore.get('tenant_subdomain')?.value?.trim().toLowerCase() || null
    const effectiveTenantId =
      (headerTenantId && headerTenantId !== 'master' ? headerTenantId : null) ||
      hostTenantId ||
      cookieSubdomain

    // 2. Determine Subdomain
    const subdomain = effectiveTenantId || null
    const isTenant = !!subdomain

    // 3. Compute Site Name
    let siteName = MASTER_SITE_NAME
    if (isTenant && subdomain) {
      siteName = IS_PRODUCTION
        ? `${subdomain}.${ROOT_DOMAIN}`
        : `${subdomain}.localhost`
    }

    // 4. Get credentials — header-based keys (passed by provisioning service with admin
    //    tokens) take priority over cookie-based user credentials.
    const headerApiKey = headersList.get('x-tenant-api-key')
    const headerApiSecret = headersList.get('x-tenant-api-secret')
    const tenantApiKey = (headerApiKey || cookieStore.get('tenant_api_key')?.value)?.trim()
    const tenantApiSecret = (headerApiSecret || cookieStore.get('tenant_api_secret')?.value)?.trim()

    return {
      isTenant,
      subdomain,
      siteName,
      apiKey: tenantApiKey || null,
      apiSecret: tenantApiSecret || null,
      hasCredentials: !!(tenantApiKey && tenantApiSecret),
      sessionId: cookieStore.get('sid')?.value ?? null,
    }
  } catch (error) {
    console.warn('[API] Failed to read tenant context:', error)
    return {
      isTenant: false,
      subdomain: null,
      siteName: MASTER_SITE_NAME,
      apiKey: null,
      apiSecret: null,
      hasCredentials: false,
      sessionId: null,
    }
  }
}

/** Dedupes tenant context reads within a single RSC/request. */
export const getTenantContext = reactCache(resolveTenantContext)

/**
 * Build authorization header based on tenant context
 */
function getAuthorizationHeader(
  context: TenantContext,
  useMasterCredentials: boolean,
  useSessionAuth: boolean
): { header: string | null; source: string } {
  if (useSessionAuth) {
    return { header: null, source: 'session_cookie (forced)' }
  }

  // If forced to use master credentials
  if (useMasterCredentials) {
    if (!MASTER_API_KEY || !MASTER_API_SECRET) {
      throw new Error('Master API credentials not configured in environment variables')
    }
    return {
      header: `token ${MASTER_API_KEY}:${MASTER_API_SECRET}`,
      source: 'master (forced)',
    }
  }

  // For tenant users with credentials, use tenant API keys
  if (context.isTenant && context.hasCredentials) {
    return {
      header: `token ${context.apiKey}:${context.apiSecret}`,
      source: `tenant (${context.subdomain})`,
    }
  }

  // Fallback to sid cookie if credentials are missing
  return { header: null, source: 'session_cookie' }
}

/**
 * Log API request details (minimal in production)
 */
function logApiRequest(
  _endpoint: string,
  _method: string,
  _siteName: string,
  _authSource: string,
  _context: TenantContext
) {
  // Logging disabled for production — enable in dev by uncommenting below
  // if (process.env.NODE_ENV === 'development') {
  //   console.log(`[API] ${_method} ${_endpoint} → ${_siteName}`)
  // }
}

/**
 * Log API error details for debugging
 */
function logApiError(
  endpoint: string,
  status: number,
  siteName: string,
  authSource: string,
  errorData: Record<string, unknown>,
  requestBody: Record<string, unknown> | null = null
) {
  const safeErrorData = sanitizeErrorData(errorData)
  const signature =
    (typeof safeErrorData.exc_type === 'string' && safeErrorData.exc_type) ||
    (typeof safeErrorData.exception === 'string' && safeErrorData.exception) ||
    (typeof safeErrorData.message === 'string' && safeErrorData.message) ||
    'unknown'
  const throttleMs = status === 401 ? AUTH_ERROR_LOG_THROTTLE_MS : DEFAULT_ERROR_LOG_THROTTLE_MS
  const logKey = `${status}:${endpoint}:${siteName}:${authSource}:${signature}`

  if (!shouldEmitThrottledLog(logKey, throttleMs)) {
    return
  }

  // Pull the most useful request context out of the body (doctype for generic
  // frappe.client.* calls, doc name when submitting, etc.) so 403/404/417
  // errors are diagnosable without a network tab.
  const requestContext = summarizeRequestBody(requestBody)

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.error(`[API] ❌ REQUEST FAILED`)
  console.error(`[API] Endpoint: ${endpoint}`)
  console.error(`[API] Status: ${status}`)
  console.error(`[API] Site: ${siteName}`)
  console.error(`[API] Auth Source: ${authSource}`)
  if (requestContext) {
    console.error(`[API] Request: ${requestContext}`)
  }
  console.error(`[API] Response:`, JSON.stringify(safeErrorData))

  if (status === 401) {
    console.error(`[API] `)
    console.error(`[API] 401 Unauthorized - Possible causes:`)
    console.error(`[API] - API key/secret is invalid or expired`)
    console.error(`[API] - User doesn't exist on target site`)
    console.error(`[API] - Wrong site being targeted (check X-Frappe-Site-Name)`)
  } else if (status === 403) {
    console.error(`[API] `)
    console.error(`[API] 403 Forbidden - Possible causes:`)
    console.error(`[API] - User lacks required role (System Manager?)`)
    console.error(`[API] - DocType permissions not granted`)
    console.error(`[API] - User is disabled`)
  }
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

function summarizeRequestBody(body: Record<string, unknown> | null): string | null {
  if (!body) return null
  const parts: string[] = []

  // Top-level doctype (frappe.client.get_list, get_value, get_count, delete, etc.)
  if (typeof body.doctype === 'string' && body.doctype) {
    parts.push(`doctype=${body.doctype}`)
  }

  // frappe.client.insert / submit / save — doctype lives inside `doc`
  const doc = body.doc as Record<string, unknown> | undefined
  if (doc && typeof doc === 'object') {
    if (typeof doc.doctype === 'string' && doc.doctype) {
      parts.push(`doc.doctype=${doc.doctype}`)
    }
    if (typeof doc.name === 'string' && doc.name) {
      parts.push(`doc.name=${doc.name}`)
    }
  }

  // Identify the specific record for get / set_value / delete calls
  if (typeof body.name === 'string' && body.name) {
    parts.push(`name=${body.name}`)
  }

  if (typeof body.filters === 'string' && body.filters.length <= 200) {
    parts.push(`filters=${body.filters}`)
  }

  return parts.length ? parts.join(' | ') : null
}

function sanitizeErrorData(errorData: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...errorData }

  const trim = (value: unknown, max: number): unknown => {
    if (typeof value !== 'string') return value
    if (value.length <= max) return value
    return `${value.slice(0, max)} ...[truncated ${value.length - max} chars]`
  }

  clone.exc = trim(clone.exc, 800)
  clone.exception = trim(clone.exception, 300)
  clone._server_messages = trim(clone._server_messages, 500)
  return clone
}

/**
 * Parse Frappe error response into readable message
 */
function parseErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.message === 'string') {
    return data.message
  }

  if (data.message && typeof data.message === 'object') {
    const msg = data.message as Record<string, unknown>
    return (msg.message as string) || JSON.stringify(data.message)
  }

  if (data._server_messages) {
    try {
      const messages = JSON.parse(data._server_messages as string)
      const firstMessage = messages[0]
      const inner = JSON.parse(firstMessage)
      return inner.message || firstMessage
    } catch {
      try {
        return JSON.parse(data._server_messages as string)[0]
      } catch {
        return data._server_messages as string
      }
    }
  }

  if (data.exception) {
    return data.exception as string
  }

  return 'Request failed'
}

function isAuthenticationFailure(status: number, data: Record<string, unknown>): boolean {
  if (status !== 401 && status !== 403) return false
  // Guest/session hitting a non-whitelisted method is not a session-expiry signal.
  if (isMethodNotWhitelistedError(data)) return false

  const excType = String(data.exc_type || '')
  const exception = String(data.exception || '')
  const message = parseErrorMessage(data)
  const sessionExpired = data.session_expired === 1 || data.session_expired === true

  return (
    sessionExpired ||
    excType.includes('AuthenticationError') ||
    exception.includes('AuthenticationError') ||
    message.includes('AuthenticationError') ||
    message.toLowerCase().includes('session expired')
  )
}

function isDoctypeRolePermissionError(data: Record<string, unknown>): boolean {
  if (data.exc_type !== 'PermissionError') return false
  return parseErrorMessage(data).includes('does not have doctype access via role permission')
}

function isMethodNotWhitelistedError(data: Record<string, unknown>): boolean {
  const message = parseErrorMessage(data)
  const exception = typeof data.exception === 'string' ? data.exception : ''
  return (
    data.exc_type === 'PermissionError' &&
    (message.includes('is not whitelisted') || exception.includes('is not whitelisted'))
  )
}

function extractDeniedDoctypeFromPermissionError(data: Record<string, unknown>): string | null {
  // Common Frappe error shapes:
  //   _error_message: "No permission for Sales Order"
  //   _server_messages: "User ... does not have doctype access ... document <strong>Sales Order</strong>"
  //
  // IMPORTANT: search each source field independently — do NOT join them with spaces first.
  // Joining creates "No permission for Quotation User <strong>..." which causes the greedy
  // space-inclusive regex to capture "Quotation User" instead of just "Quotation".
  const sources = [
    typeof data._error_message === 'string' ? data._error_message : null,
    parseErrorMessage(data),
    typeof data.exception === 'string' ? data.exception : null,
  ].filter((s): s is string => typeof s === 'string' && s.length > 0)

  for (const src of sources) {
    // "No permission for Sales Order"
    const m1 = src.match(/No permission for\s+([A-Za-z0-9][A-Za-z0-9 _-]*)/i)
    if (m1?.[1]) return m1[1].trim()

    // "document <strong>Sales Order</strong>"
    const m2 = src.match(/document\s+<strong>([^<]+)<\/strong>/i)
    if (m2?.[1]) return m2[1].trim()

    // "for document Sales Order" (plain-text variant without HTML)
    const m3 = src.match(/for document\s+([A-Za-z0-9][A-Za-z0-9 _-]*)/i)
    if (m3?.[1]) return m3[1].trim()
  }

  return null
}

async function tryRepairTenantDocPerms(
  context: TenantContext,
  errorData: Record<string, unknown>
): Promise<boolean> {
  if (!context.isTenant || !context.subdomain || !isDoctypeRolePermissionError(errorData)) {
    return false
  }

  // Never repair when the request targeted the master site (routing misconfig).
  if (context.siteName === MASTER_SITE_NAME) {
    return false
  }

  const cookieStore = await cookies()
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  if (!userEmail) return false

  const repairMarker = `${context.subdomain}:${userEmail}`
  if (cookieStore.get(DOCPERM_REPAIR_COOKIE)?.value === repairMarker) {
    return false
  }

  const cooldownKey = `${context.subdomain}:${userEmail}`
  const inFlight = docpermRepairInFlight.get(cooldownKey)
  if (inFlight) return inFlight

  const now = Date.now()
  const lastAttempt = docpermRepairLastAttempt.get(cooldownKey)
  if (lastAttempt) {
    const elapsed = now - lastAttempt
    if (elapsed < REPAIR_RETRY_WINDOW_MS) return true
    if (elapsed < DOCPERM_REPAIR_COOLDOWN_MS) return false
  }

  const promise = (async (): Promise<boolean> => {
    docpermRepairLastAttempt.set(cooldownKey, Date.now())
    try {
      const { seedTenantDocPerms } = await import('@/lib/provisioning-client')
      await seedTenantDocPerms(context.subdomain!)

      const deniedDoctype = extractDeniedDoctypeFromPermissionError(errorData)
      console.warn(
        `[API] Auto-repaired DocPerms for ${userEmail} on ${context.subdomain}` +
          (deniedDoctype ? ` (denied: ${deniedDoctype})` : ''),
      )
      cookieStore.set(DOCPERM_REPAIR_COOKIE, repairMarker, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      })
      return true
    } catch (error) {
      console.warn('[API] Automatic tenant DocPerm repair failed:', error)
      return false
    } finally {
      docpermRepairInFlight.delete(cooldownKey)
    }
  })()

  docpermRepairInFlight.set(cooldownKey, promise)
  return promise
}

/** @deprecated Use verifyTenantApiToken from @/lib/verify-tenant-api-token */
async function validateTenantApiToken(
  siteName: string,
  apiKey: string,
  apiSecret: string,
  expectedEmail: string
): Promise<boolean> {
  return verifyTenantApiToken(siteName, apiKey, apiSecret, expectedEmail)
}

async function sessionKeysToContext(
  context: TenantContext,
  siteName: string,
  userEmail: string,
): Promise<TenantContext | null> {
  const sid = context.sessionId
  if (!sid) return null
  const keys = await mintTenantApiKeysViaSession(
    siteName,
    userEmail,
    sid,
    BASE_URL,
    REQUEST_TIMEOUT_MS,
  )
  if (!keys) return null
  return {
    ...context,
    apiKey: keys.apiKey,
    apiSecret: keys.apiSecret,
    hasCredentials: true,
  }
}

async function tryResolveTenantApiKeys(
  context: TenantContext,
  siteName: string
): Promise<TenantContext | null> {
  if (!context.isTenant || !context.subdomain) return null

  const cookieStore = await cookies()
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  if (!userEmail) return null

  const cacheKey = `${context.subdomain}:${userEmail}`
  const cached = tenantKeySyncCache.get(cacheKey)
  if (cached && Date.now() - cached.at < TENANT_KEY_SYNC_CACHE_MS) {
    return {
      ...context,
      apiKey: cached.apiKey,
      apiSecret: cached.apiSecret,
      hasCredentials: true,
    }
  }

  const inFlight = tenantKeySyncInFlight.get(cacheKey)
  if (inFlight) return inFlight

  const promise = (async (): Promise<TenantContext | null> => {
    const applyKeys = (apiKey: string, apiSecret: string): TenantContext => {
      tenantKeySyncCache.set(cacheKey, { apiKey, apiSecret, at: Date.now() })
      return { ...context, apiKey, apiSecret, hasCredentials: true }
    }

    try {
      const { generateUserApiKeys } = await import('@/lib/provisioning-client')
      let keys = await generateUserApiKeys(context.subdomain!, userEmail, 45_000)
      if (!(await verifyTenantApiToken(siteName, keys.api_key, keys.api_secret, userEmail))) {
        console.warn(
          `[API] Provisioning keys failed HTTP validation for ${userEmail} on ${context.subdomain}; forcing rotate`
        )
        keys = await generateUserApiKeys(context.subdomain!, userEmail, 45_000, { forceRotate: true })
      }
      if (await verifyTenantApiToken(siteName, keys.api_key, keys.api_secret, userEmail)) {
        return applyKeys(keys.api_key, keys.api_secret)
      }

      const resolved = await sessionKeysToContext(context, siteName, userEmail)
      if (
        resolved?.apiKey &&
        resolved.apiSecret &&
        (await verifyTenantApiToken(siteName, resolved.apiKey, resolved.apiSecret, userEmail))
      ) {
        return applyKeys(resolved.apiKey, resolved.apiSecret)
      }
      return null
    } catch (error) {
      console.warn('[API] Provisioning key sync failed; trying session regenerate:', error)
      const resolved = await sessionKeysToContext(context, siteName, userEmail)
      if (!resolved?.apiKey || !resolved.apiSecret) return null
      return applyKeys(resolved.apiKey, resolved.apiSecret)
    }
  })()

  tenantKeySyncInFlight.set(cacheKey, promise)
  try {
    return await promise
  } finally {
    tenantKeySyncInFlight.delete(cacheKey)
  }
}

async function tryRepairTenantRoles(
  context: TenantContext,
  errorData: Record<string, unknown>
): Promise<boolean> {
  if (!context.isTenant || !context.subdomain || !isDoctypeRolePermissionError(errorData)) {
    return false
  }

  // Role repair is only useful for a narrow class of permission errors (e.g. Has Role child table).
  // For normal business DocTypes (like Quality Inspection), the fix is DocPerms, not roles.
  const deniedDoctype = extractDeniedDoctypeFromPermissionError(errorData)
  const ROLE_REPAIR_ALLOWLIST = new Set(['Has Role', 'User', 'Role'])
  if (deniedDoctype && !ROLE_REPAIR_ALLOWLIST.has(deniedDoctype)) {
    return false
  }

  const cookieStore = await cookies()
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  if (!userEmail) return false

  const cooldownKey = `${context.subdomain}:${userEmail}`
  const inFlight = roleRepairInFlight.get(cooldownKey)
  if (inFlight) return inFlight

  const now = Date.now()
  const lastAttempt = roleRepairLastAttempt.get(cooldownKey)
  if (lastAttempt) {
    const elapsed = now - lastAttempt
    if (elapsed < REPAIR_RETRY_WINDOW_MS) return true
    if (elapsed < ROLE_REPAIR_COOLDOWN_MS) return false
  }

  const promise = (async (): Promise<boolean> => {
    roleRepairLastAttempt.set(cooldownKey, Date.now())
    try {
      const { assignUserRoles } = await import('@/lib/provisioning-client')
      const { ROLE_SETS } = await import('@/lib/role-sets')

      const roleType = cookieStore.get('tenant_role_type')?.value || 'member'
      const rolesToAssign = ROLE_SETS[roleType] || ROLE_SETS.member

      await assignUserRoles(context.subdomain!, userEmail, rolesToAssign)
      console.warn(`[API] Auto-repaired roles for ${userEmail} (${roleType}): ${rolesToAssign.join(', ')}`)
      return true
    } catch (error) {
      console.warn('[API] Automatic tenant role repair failed:', error)
      return false
    } finally {
      roleRepairInFlight.delete(cooldownKey)
    }
  })()

  roleRepairInFlight.set(cooldownKey, promise)
  return promise
}

// ============================================================================
// MAIN API FUNCTION
// ============================================================================

/**
 * Make authenticated request to Frappe/ERPNext
 * 
 * Automatically determines which credentials to use:
 * - For tenant users: Uses tenant API key/secret from cookies
 * - For admin users: Uses master API key/secret from env
 * 
 * Always sets X-Frappe-Site-Name header for proper multi-tenant routing
 */
export async function frappeRequest(
  endpoint: string,
  method: ApiRequestOptions['method'] = 'GET',
  body: Record<string, unknown> | null = null,
  options: Pick<ApiRequestOptions, 'useMasterCredentials' | 'useSessionAuth' | 'siteOverride' | 'hasRoleRepairAttempted' | 'hasSessionFallbackAttempted' | 'hasTenantTokenRetryAttempted'> = {}
): Promise<unknown> {
  const context = await getTenantContext()

  const siteName = options.siteOverride || (options.useMasterCredentials ? MASTER_SITE_NAME : context.siteName)

  const shouldCoalesce =
    method === 'GET' &&
    !options.hasRoleRepairAttempted &&
    !options.hasSessionFallbackAttempted &&
    !options.hasTenantTokenRetryAttempted

  const run = () => frappeRequestWithContext(context, siteName, endpoint, method, body, options)

  if (shouldCoalesce) {
    const key = frappeGetCoalesceKey(siteName, endpoint, body, context)
    const cached = await readFrappeGetCache(key)
    if (cached !== undefined) return cached

    return coalesceFrappeGet(key, async () => {
      const result = await run()
      await writeFrappeGetCache(key, result)
      return result
    })
  }

  return run()
}

async function frappeRequestWithContext(
  context: TenantContext,
  siteName: string,
  endpoint: string,
  method: ApiRequestOptions['method'] = 'GET',
  body: Record<string, unknown> | null = null,
  options: Pick<ApiRequestOptions, 'useMasterCredentials' | 'useSessionAuth' | 'siteOverride' | 'hasRoleRepairAttempted' | 'hasSessionFallbackAttempted' | 'hasTenantTokenRetryAttempted'> = {}
): Promise<unknown> {
  const sid = context.sessionId ?? undefined
  const useSessionAuth = options.useSessionAuth === true

  // Determine which credentials to use
  const { header: authHeader, source: authSource } = getAuthorizationHeader(
    context,
    options.useMasterCredentials || false,
    useSessionAuth
  )

  // Log request details
  logApiRequest(endpoint, method, siteName, authSource, context)

  // Build request headers (tenant FQDN URL when ERP_NEXT_URL is loopback — see frappe-site-headers.ts)
  const frappeBaseUrl = frappeEffectiveBaseUrl(siteName, BASE_URL)
  const requestHeaders: Record<string, string> = frappeSiteRequestHeaders(siteName, frappeBaseUrl, {
    Accept: 'application/json',
  })

  if (authHeader) {
    requestHeaders['Authorization'] = authHeader
  }

  // Only attach sid when not using API token — avoids Frappe preferring a stale session.
  if (sid && !authHeader) {
    requestHeaders['Cookie'] = `sid=${sid}`
  }

  if (method !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json'
  }

  // Build URL with query params for GET requests
  let url = `${frappeBaseUrl}/api/method/${endpoint}`

  if (method === 'GET' && body) {
    const params = new URLSearchParams()
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })
    url += `?${params.toString()}`
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    cache: 'no-store',
  }

  if (method !== 'GET' && body) {
    fetchOptions.body = JSON.stringify(body)
  }

  // Execute request
  try {
    const response = await fetchWithTimeout(url, fetchOptions, REQUEST_TIMEOUT_MS)
    const data = await parseResponseData(response)

    if (!response.ok) {
      // Session/Guest or stale sid cannot call server methods — mint tenant API keys and retry.
      if (
        response.status === 403 &&
        context.isTenant &&
        !options.hasTenantTokenRetryAttempted &&
        isMethodNotWhitelistedError(data) &&
        (!authHeader || useSessionAuth)
      ) {
        const synced = await tryResolveTenantApiKeys(context, siteName)
        if (synced?.hasCredentials) {
          if (shouldEmitThrottledLog(`session-not-whitelisted:${endpoint}:${context.siteName}`, DEFAULT_ERROR_LOG_THROTTLE_MS)) {
            console.warn(`[API] Session auth cannot call ${endpoint}; retrying with tenant API token`)
          }
          return frappeRequestWithContext(synced, siteName, endpoint, method, body, {
            ...options,
            hasTenantTokenRetryAttempted: true,
            hasSessionFallbackAttempted: true,
            useSessionAuth: false,
          })
        }
      }

      if (
        response.status === 403 &&
        useSessionAuth &&
        !options.hasTenantTokenRetryAttempted &&
        context.hasCredentials &&
        isMethodNotWhitelistedError(data)
      ) {
        if (shouldEmitThrottledLog(`session-not-whitelisted:${endpoint}:${context.siteName}`, DEFAULT_ERROR_LOG_THROTTLE_MS)) {
          console.warn(`[API] Session auth cannot call ${endpoint}; retrying with tenant API token`)
        }
        return frappeRequestWithContext(context, siteName, endpoint, method, body, {
          ...options,
          hasTenantTokenRetryAttempted: true,
          hasSessionFallbackAttempted: true,
          useSessionAuth: false,
        })
      }

      if (
        response.status === 403 &&
        !options.useMasterCredentials &&
        !options.hasRoleRepairAttempted &&
        (await tryRepairTenantDocPerms(context, data) || await tryRepairTenantRoles(context, data))
      ) {
        return frappeRequestWithContext(context, siteName, endpoint, method, body, {
          ...options,
          hasRoleRepairAttempted: true,
        })
      }

      // Stale cookie keys — sync from Frappe once (read-only when keys are still valid).
      if (
        response.status === 401 &&
        context.isTenant &&
        !options.hasTenantTokenRetryAttempted
      ) {
        const synced = await tryResolveTenantApiKeys(context, siteName)
        if (synced) {
          if (shouldEmitThrottledLog(`key-sync:${endpoint}:${context.siteName}`, AUTH_ERROR_LOG_THROTTLE_MS)) {
            console.warn(`[API] 401 on tenant token for ${endpoint}; resolved keys and retrying`)
          }
          return frappeRequestWithContext(synced, siteName, endpoint, method, body, {
            ...options,
            hasTenantTokenRetryAttempted: true,
            useSessionAuth: false,
          })
        }
      }

      // Fresh login often has a valid sid before cookie keys propagate — use session once.
      if (
        response.status === 401 &&
        context.isTenant &&
        options.hasTenantTokenRetryAttempted &&
        !options.hasSessionFallbackAttempted &&
        sid
      ) {
        if (shouldEmitThrottledLog(`session-fallback:${endpoint}:${context.siteName}`, AUTH_ERROR_LOG_THROTTLE_MS)) {
          console.warn(`[API] Tenant token auth failed for ${endpoint}; retrying with session cookie`)
        }
        return frappeRequestWithContext(context, siteName, endpoint, method, body, {
          ...options,
          hasSessionFallbackAttempted: true,
          useSessionAuth: true,
        })
      }

      logApiError(endpoint, response.status, siteName, authSource, data, body)
      if (isAuthenticationFailure(response.status, data)) {
        throw new Error(`SESSION_EXPIRED: ${parseErrorMessage(data)}`)
      }
      const errorMessage = parseErrorMessage(data)
      throw new Error(errorMessage)
    }

    return data.message ?? data.data ?? data
  } catch (error) {
    if (isTimeoutLikeError(error)) {
      throw new Error(`ERP backend timeout after ${REQUEST_TIMEOUT_MS}ms (${endpoint})`)
    }

    if (
      error instanceof Error &&
      !error.message.includes('not found') &&
      !error.message.includes('AuthenticationError')
    ) {
      const logKey = `request-failed:${endpoint}:${error.message}`
      if (shouldEmitThrottledLog(logKey, DEFAULT_ERROR_LOG_THROTTLE_MS)) {
        console.error(`[API] Request failed:`, error.message)
      }
    }
    throw error
  }
}

// ============================================================================
// SESSION-BASED REQUEST (for user-context operations)
// ============================================================================

/**
 * Server-side Frappe request — uses tenant API keys from login cookies.
 */
export async function userRequest(
  endpoint: string,
  method: ApiRequestOptions['method'] = 'GET',
  body: Record<string, unknown> | null = null
): Promise<unknown> {
  return frappeRequest(endpoint, method, body)
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Make request to master site (bypasses tenant context)
 * Use for operations that must hit the master database
 */
export async function masterRequest(
  endpoint: string,
  method: ApiRequestOptions['method'] = 'GET',
  body: Record<string, unknown> | null = null
): Promise<unknown> {
  return frappeRequest(endpoint, method, body, { useMasterCredentials: true })
}

/**
 * Make request to CURRENT TENANT site using MASTER credentials
 * Use for ERP data operations where the tenant user may lack role permissions
 * (e.g., Sales Invoice, Payment Entry reads)
 */
export async function tenantAdminRequest(
  endpoint: string,
  method: ApiRequestOptions['method'] = 'GET',
  body: Record<string, unknown> | null = null
): Promise<unknown> {
  const context = await getTenantContext()
  // IMPORTANT:
  // In our deployment, the master site's API key/secret are NOT valid on tenant sites.
  // For tenant-scoped operations, authenticate using the tenant user's API keys (httpOnly cookies)
  // while still targeting the current tenant via X-Frappe-Site-Name.
  //
  // For true ignore_permissions / "admin on tenant" operations, use the provisioning service
  // endpoints (e.g., getUserRoles / assignUserRoles) which are designed for that purpose.
  return frappeRequest(endpoint, method, body, {
    useMasterCredentials: false,
    siteOverride: context.siteName,
  })
}
