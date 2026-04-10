import { cookies, headers } from 'next/headers'

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
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | null
  useMasterCredentials?: boolean // Force use of master credentials
  siteOverride?: string // Override the target site name (use with useMasterCredentials for tenant admin ops)
  hasRoleRepairAttempted?: boolean
}

const ROLE_REPAIR_COOLDOWN_MS = 10 * 60 * 1000
const roleRepairLastAttempt = new Map<string, number>()
const apiErrorLogLastSeen = new Map<string, number>()

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
export async function getTenantContext(): Promise<TenantContext> {
  try {
    const headersList = await headers()
    const cookieStore = await cookies()

    // 1. Get Tenant ID from Middleware Header (Source of Truth)
    const headerTenantId = headersList.get('x-tenant-id')
    const iframeContext = headersList.get('x-iframe-context') // Future proofing

    // 2. Determine Subdomain
    // logic: if header is 'master' or missing -> null (root domain)
    // else -> subdomain string
    const subdomain = (headerTenantId && headerTenantId !== 'master') ? headerTenantId : null
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
    const tenantApiKey = headerApiKey || cookieStore.get('tenant_api_key')?.value
    const tenantApiSecret = headerApiSecret || cookieStore.get('tenant_api_secret')?.value

    return {
      isTenant,
      subdomain,
      siteName,
      apiKey: tenantApiKey || null,
      apiSecret: tenantApiSecret || null,
      hasCredentials: !!(tenantApiKey && tenantApiSecret),
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
    }
  }
}

/**
 * Build authorization header based on tenant context
 */
function getAuthorizationHeader(
  context: TenantContext,
  useMasterCredentials: boolean
): { header: string; source: string } {
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

  // For tenant users WITHOUT credentials - this is an error state  
  if (context.isTenant && !context.hasCredentials) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`[API] ❌ TENANT API CREDENTIALS NOT FOUND`)
    console.error(`[API] Tenant subdomain: ${context.subdomain}`)
    console.error(`[API] Target site: ${context.siteName}`)
    console.error(`[API] `)
    console.error(`[API] This usually means:`)
    console.error(`[API] 1. The SaaS Tenant record in master DB is missing api_key/api_secret`)
    console.error(`[API] 2. The user logged in before provisioning completed`)
    console.error(`[API] 3. Cookies are not being set correctly (domain scope issue)`)
    console.error(`[API] `)
    console.error(`[API] Solution: Log out and log back in after ensuring the`)
    console.error(`[API] SaaS Tenant record has api_key and api_secret populated.`)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // Use a special error code so the client/middleware can detect this and auto-logout
    throw new Error(`TENANT_CREDENTIALS_MISSING:${context.subdomain}`)
  }

  // Default: admin user with master credentials
  if (!MASTER_API_KEY || !MASTER_API_SECRET) {
    throw new Error('ERP_API_KEY and ERP_API_SECRET must be set in environment variables')
  }
  return {
    header: `token ${MASTER_API_KEY}:${MASTER_API_SECRET}`,
    source: 'master (default)',
  }
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
  errorData: Record<string, unknown>
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

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.error(`[API] ❌ REQUEST FAILED`)
  console.error(`[API] Endpoint: ${endpoint}`)
  console.error(`[API] Status: ${status}`)
  console.error(`[API] Site: ${siteName}`)
  console.error(`[API] Auth Source: ${authSource}`)
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

function isDoctypeRolePermissionError(data: Record<string, unknown>): boolean {
  if (data.exc_type !== 'PermissionError') return false
  return parseErrorMessage(data).includes('does not have doctype access via role permission')
}

async function tryRepairTenantRoles(
  context: TenantContext,
  errorData: Record<string, unknown>
): Promise<boolean> {
  if (!context.isTenant || !context.subdomain || !isDoctypeRolePermissionError(errorData)) {
    return false
  }

  const cookieStore = await cookies()
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  if (!userEmail) return false

  const cooldownKey = `${context.subdomain}:${userEmail}`
  const now = Date.now()
  const lastAttempt = roleRepairLastAttempt.get(cooldownKey)
  if (lastAttempt && now - lastAttempt < ROLE_REPAIR_COOLDOWN_MS) {
    return false
  }

  roleRepairLastAttempt.set(cooldownKey, now)

  try {
    const { assignUserRoles } = await import('@/lib/provisioning-client')
    const { ROLE_SETS } = await import('@/lib/role-sets')

    // Use the role type stored at login so we assign the correct ROLE_SET,
    // not a hardcoded minimum — otherwise we'd defeat per-role RBAC.
    // Default to 'member' (most restrictive non-admin set) if cookie is missing.
    const roleType = cookieStore.get('tenant_role_type')?.value || 'member'
    const rolesToAssign = ROLE_SETS[roleType] || ROLE_SETS.member

    await assignUserRoles(context.subdomain, userEmail, rolesToAssign)
    console.warn(`[API] Auto-repaired roles for ${userEmail} (${roleType}): ${rolesToAssign.join(', ')}`)
    return true
  } catch (error) {
    console.warn('[API] Automatic tenant role repair failed:', error)
    return false
  }
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
  options: Pick<ApiRequestOptions, 'useMasterCredentials' | 'siteOverride' | 'hasRoleRepairAttempted'> = {}
): Promise<unknown> {
  // Get tenant context from cookies/headers
  const context = await getTenantContext()

  // Determine which credentials to use
  const { header: authHeader, source: authSource } = getAuthorizationHeader(
    context,
    options.useMasterCredentials || false
  )

  // Use appropriate site name (siteOverride takes priority, then master/tenant logic)
  const siteName = options.siteOverride || (options.useMasterCredentials ? MASTER_SITE_NAME : context.siteName)

  // Log request details
  logApiRequest(endpoint, method, siteName, authSource, context)

  // Build request headers
  const requestHeaders: HeadersInit = {
    'Accept': 'application/json',
    'Authorization': authHeader,
    'X-Frappe-Site-Name': siteName,
  }

  if (method !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json'
  }

  // Build URL with query params for GET requests
  let url = `${BASE_URL}/api/method/${endpoint}`

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
      if (
        response.status === 403 &&
        !options.useMasterCredentials &&
        !options.hasRoleRepairAttempted &&
        await tryRepairTenantRoles(context, data)
      ) {
        return frappeRequest(endpoint, method, body, {
          ...options,
          hasRoleRepairAttempted: true,
        })
      }

      logApiError(endpoint, response.status, siteName, authSource, data)
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
 * Make authenticated request using session cookie
 * Use this for operations that need the logged-in user's context
 */
export async function userRequest(
  endpoint: string,
  method: ApiRequestOptions['method'] = 'GET',
  body: Record<string, unknown> | null = null
): Promise<unknown> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('sid')

  if (!sessionCookie) {
    throw new Error('Not authenticated - no session cookie found')
  }

  // Get tenant context for site routing
  const context = await getTenantContext()

  // Build request headers
  const requestHeaders: HeadersInit = {
    'Accept': 'application/json',
    'Cookie': `sid=${sessionCookie.value}`,
    'Host': context.siteName,
    'X-Frappe-Site-Name': context.siteName,
  }

  if (method !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json'
  }

  // Build URL
  let url = `${BASE_URL}/api/method/${endpoint}`

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
    credentials: 'include',
  }

  if (method !== 'GET' && body) {
    fetchOptions.body = JSON.stringify(body)
  }

  // Execute request
  try {
    const response = await fetchWithTimeout(url, fetchOptions, REQUEST_TIMEOUT_MS)
    const data = await parseResponseData(response)

    if (!response.ok) {
      console.error('[API] userRequest error:', {
        status: response.status,
        endpoint,
        siteName: context.siteName,
        data,
      })
      throw new Error(parseErrorMessage(data))
    }

    return data.message ?? data.data ?? data
  } catch (error) {
    if (isTimeoutLikeError(error)) {
      throw new Error(`ERP backend timeout after ${REQUEST_TIMEOUT_MS}ms (${endpoint})`)
    }

    if (error instanceof Error) {
      console.error(`[API] userRequest failed:`, error.message)
    }
    throw error
  }
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
  return frappeRequest(endpoint, method, body, {
    useMasterCredentials: true,
    siteOverride: context.siteName
  })
}
