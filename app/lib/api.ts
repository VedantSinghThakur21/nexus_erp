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
async function getTenantContext(): Promise<TenantContext> {
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

    // 4. Get User/Tenant Credentials (still from cookies/db)
    // These are for AUTHORIZATION, not IDENTIFICATION
    const tenantApiKey = cookieStore.get('tenant_api_key')?.value
    const tenantApiSecret = cookieStore.get('tenant_api_secret')?.value

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
 * Log API request details for debugging
 */
function logApiRequest(
  endpoint: string,
  method: string,
  siteName: string,
  authSource: string,
  context: TenantContext
) {
  console.log(`[API] ─────────────────────────────────────`)
  console.log(`[API] Request: ${method} ${endpoint}`)
  console.log(`[API] Site: ${siteName}`)
  console.log(`[API] Auth: ${authSource}`)
  console.log(`[API] Is Tenant: ${context.isTenant}`)
  if (context.isTenant) {
    console.log(`[API] Subdomain: ${context.subdomain}`)
    console.log(`[API] Has Credentials: ${context.hasCredentials}`)
  }
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
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.error(`[API] ❌ REQUEST FAILED`)
  console.error(`[API] Endpoint: ${endpoint}`)
  console.error(`[API] Status: ${status}`)
  console.error(`[API] Site: ${siteName}`)
  console.error(`[API] Auth Source: ${authSource}`)
  console.error(`[API] Response:`, JSON.stringify(errorData, null, 2))

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
  options: { useMasterCredentials?: boolean } = {}
): Promise<unknown> {
  // Get tenant context from cookies/headers
  const context = await getTenantContext()

  // Determine which credentials to use
  const { header: authHeader, source: authSource } = getAuthorizationHeader(
    context,
    options.useMasterCredentials || false
  )

  // Use appropriate site name
  const siteName = options.useMasterCredentials ? MASTER_SITE_NAME : context.siteName

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
    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    if (!response.ok) {
      logApiError(endpoint, response.status, siteName, authSource, data)
      const errorMessage = parseErrorMessage(data)
      throw new Error(errorMessage)
    }

    console.log(`[API] ✅ Success: ${endpoint}`)
    return data.message ?? data.data ?? data
  } catch (error) {
    if (error instanceof Error && !error.message.includes('not found')) {
      console.error(`[API] Request failed:`, error.message)
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

  console.log(`[API] userRequest: ${method} ${endpoint}`)
  console.log(`[API] Site: ${context.siteName}`)
  console.log(`[API] Session: ${sessionCookie.value.substring(0, 20)}...`)

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
    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    if (!response.ok) {
      console.error('[API] userRequest error:', {
        status: response.status,
        endpoint,
        siteName: context.siteName,
        data,
      })
      throw new Error(data.message || data._server_messages || 'Request failed')
    }

    console.log(`[API] ✅ userRequest success: ${endpoint}`)
    return data.message ?? data.data ?? data
  } catch (error) {
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
