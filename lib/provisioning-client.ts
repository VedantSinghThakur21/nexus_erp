/**
 * Provisioning Service Client
 * ============================
 * Clean HTTP client for the Python provisioning microservice.
 * 
 * Replaces all `docker exec` + `bench console` shell hacks with
 * proper REST API calls to the provisioning service.
 * 
 * This module is SERVER-ONLY (uses env vars for secrets).
 */

const PROVISIONING_SERVICE_URL = process.env.PROVISIONING_SERVICE_URL || 'http://localhost:8001'
const PROVISIONING_API_SECRET = process.env.PROVISIONING_API_SECRET

if (!PROVISIONING_API_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('PROVISIONING_API_SECRET must be set in production')
}

// ============================================================================
// Types
// ============================================================================

export interface ProvisionRequest {
  organization_name: string
  admin_email: string
  admin_password?: string
  admin_full_name?: string
  plan_type?: 'Free' | 'Pro' | 'Enterprise'
}

export interface ProvisionResult {
  success: boolean
  site_name?: string
  subdomain?: string
  admin_password?: string
  api_key?: string
  api_secret?: string
  error?: string
  steps_completed?: string[]
  checks?: {
    site_alive: boolean
    user_exists: boolean
    roles_correct: boolean
    api_key_valid: boolean
    docperms_set: boolean
  }
  warnings?: string[]
}

export interface SubdomainCheckResult {
  available: boolean
  subdomain: string
  reason?: string
}

interface ServiceHealth {
  status: string
  bench_path: string
  master_site: string
  timestamp: string
}

// ============================================================================
// Internal Fetch Helper
// ============================================================================

async function serviceRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE'
    body?: Record<string, unknown>
    timeout?: number
  } = {}
): Promise<T> {
  const { method = 'GET', body, timeout = 120_000 } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${PROVISIONING_SERVICE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Provisioning-Secret': PROVISIONING_API_SECRET || '',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const rawText = await response.text()
    let data: unknown = null
    let parseError: string | null = null

    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText)
      } catch (err) {
        parseError = err instanceof Error ? err.message : String(err)
      }
    } else {
      parseError = 'empty response body'
    }

    if (!response.ok) {
      let detail = `Service returned ${response.status}`
      if (
        data &&
        typeof data === 'object' &&
        typeof (data as { detail?: unknown }).detail === 'string'
      ) {
        detail = (data as { detail: string }).detail as string
      } else if (rawText && rawText.length > 0) {
        detail = `Service returned ${response.status}: ${rawText.slice(0, 300)}`
      }
      throw new ProvisioningError(detail, response.status, data ?? rawText)
    }

    if (parseError) {
      console.warn(
        `[ProvisioningClient] ${path}: response parse failed (${parseError}). ` +
          `Status=${response.status} Content-Type=${response.headers.get('content-type') || 'none'} ` +
          `Body=${rawText.slice(0, 300) || '<empty>'}`,
      )
      throw new ProvisioningError(
        `Provisioning service returned unparseable body (${parseError}): ${rawText.slice(0, 200) || '<empty>'}`,
        502,
        rawText,
      )
    }

    return data as T
  } catch (error) {
    if (error instanceof ProvisioningError) throw error

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProvisioningError(
        `Provisioning service timed out after ${timeout / 1000}s`,
        504,
      )
    }

    // Service unreachable
    throw new ProvisioningError(
      `Provisioning service unreachable at ${PROVISIONING_SERVICE_URL}. ` +
      `Is the Python service running?`,
      503,
    )
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if the provisioning service is healthy.
 */
export async function checkServiceHealth(): Promise<ServiceHealth> {
  return serviceRequest<ServiceHealth>('/health', { timeout: 5_000 })
}

/**
 * Check if a subdomain is available.
 */
export async function checkSubdomain(subdomain: string): Promise<SubdomainCheckResult> {
  return serviceRequest<SubdomainCheckResult>(
    `/api/v1/check-subdomain/${encodeURIComponent(subdomain)}`,
    { timeout: 30_000 }, // docker exec overhead can add 3-5s; 30s is safe
  )
}

/**
 * Provision a new tenant site.
 * 
 * This is the main operation — creates a Frappe site, installs apps,
 * creates admin user, generates API keys, and registers in Master DB.
 * 
 * Takes 30-90 seconds. Use with streaming status updates on the frontend.
 */
export async function provisionTenantSite(req: ProvisionRequest): Promise<ProvisionResult> {
  return serviceRequest<ProvisionResult>(
    '/api/v1/provision',
    {
      method: 'POST',
      body: req as unknown as Record<string, unknown>,
      timeout: 600_000, // 10 minutes — bench new-site (~3m) + install-app (~5m) + setup
    },
  )
}

/**
 * Seed tree defaults (Territory, Customer Group) for an existing tenant.
 * Uses ignore_permissions=True in Frappe so the regular tenant user doesn't need System Manager.
 * Idempotent — safe to call multiple times.
 */
export async function seedTenantDefaults(subdomain: string): Promise<{
  success: boolean
  site: string
  result: {
    territory: string
    customer_group: string
    item_groups: string
    opportunity_types: string
    sales_stages: string
    price_list?: string
    selling_settings?: string
    uoms?: string
    docperms?: string
    healed_users?: string[]
  }
}> {
  return serviceRequest(
    `/api/v1/seed-defaults/${encodeURIComponent(subdomain)}`,
    { method: 'POST', timeout: 60_000 },
  )
}

/**
 * Fetch tenant-specific catalogue defaults from ERPNext via ignore_permissions.
 * Returns resolved values that are safe to use for Item creation links.
 */
export async function getTenantCatalogDefaults(subdomain: string): Promise<{
  success: boolean
  site: string
  defaults: {
    item_group: string | null
    stock_uom: string | null
    item_groups: string[]
    uoms: string[]
  }
}> {
  return serviceRequest(
    `/api/v1/catalog-defaults/${encodeURIComponent(subdomain)}`,
    { timeout: 30_000 },
  )
}

/**
 * Create an Item on a tenant site via provisioning service with ignore_permissions.
 * The service resolves valid Item Group/UOM links against tenant masters.
 */
export async function createTenantItemWithDefaults(
  subdomain: string,
  itemData: Record<string, unknown>,
): Promise<{
  success: boolean
  site: string
  item: {
    name: string
    item_group: string
    stock_uom: string
  }
}> {
  return serviceRequest(
    `/api/v1/create-item/${encodeURIComponent(subdomain)}`,
    {
      method: 'POST',
      body: itemData,
      timeout: 45_000,
    },
  )
}

/**
 * Generate API key + secret for any user on a tenant site.
 * Bypasses Frappe's System Manager restriction via ignore_permissions=True.
 * Called during login when the generate_keys RPC fails with PermissionError.
 */
export async function generateUserApiKeys(
  subdomain: string,
  userEmail: string,
  timeout = 30_000,
): Promise<{ success: boolean; api_key: string; api_secret: string }> {
  const response = await serviceRequest<unknown>(
    `/api/v1/generate-user-keys/${encodeURIComponent(subdomain)}`,
    {
      method: 'POST',
      body: { user_email: userEmail },
      timeout,
    },
  )

  if (!response || typeof response !== 'object') {
    throw new ProvisioningError(
      'Provisioning response was empty or non-object',
      502,
      response,
    )
  }

  const responseRecord = response as Record<string, unknown>

  // Backward/forward compatible response extraction:
  // - { api_key, api_secret }
  // - { success, api_key, api_secret }
  // - { message: { api_key, api_secret } }
  // - { data: { api_key, api_secret } }
  // - camelCase variants from older gateways
  const nested =
    (typeof responseRecord.message === 'object' && responseRecord.message !== null ? responseRecord.message : null) ||
    (typeof responseRecord.data === 'object' && responseRecord.data !== null ? responseRecord.data : null) ||
    (typeof responseRecord.result === 'object' && responseRecord.result !== null ? responseRecord.result : null)

  const pick = (obj: Record<string, unknown> | null | undefined, snake: string, camel: string): string | null => {
    if (!obj) return null
    const snakeVal = obj[snake]
    if (typeof snakeVal === 'string' && snakeVal.trim()) return snakeVal
    const camelVal = obj[camel]
    if (typeof camelVal === 'string' && camelVal.trim()) return camelVal
    return null
  }

  const apiKey =
    pick(responseRecord, 'api_key', 'apiKey') ||
    pick(nested as Record<string, unknown> | null, 'api_key', 'apiKey')
  const apiSecret =
    pick(responseRecord, 'api_secret', 'apiSecret') ||
    pick(nested as Record<string, unknown> | null, 'api_secret', 'apiSecret')

  if (!apiKey || !apiSecret) {
    const detail =
      (typeof responseRecord.detail === 'string' && responseRecord.detail) ||
      (typeof responseRecord.error === 'string' && responseRecord.error) ||
      (typeof responseRecord.message === 'string' && responseRecord.message) ||
      'Provisioning response missing api_key/api_secret'
    throw new ProvisioningError(detail, 502, responseRecord)
  }

  return { success: true, api_key: apiKey, api_secret: apiSecret }
}

/**
 * Assign roles to a user on a tenant site via ignore_permissions.
 * Replaces existing roles with the provided set.
 */
export async function assignUserRoles(
  subdomain: string,
  userEmail: string,
  roles: string[],
): Promise<{ success: boolean; assigned: string[] }> {
  return serviceRequest(
    `/api/v1/assign-user-roles/${encodeURIComponent(subdomain)}`,
    {
      method: 'POST',
      body: { user_email: userEmail, roles },
      timeout: 30_000,
    },
  )
}

/**
 * Fetch a user's roles from a tenant site via the provisioning service.
 * Uses ignore_permissions=True so it works regardless of the caller's Frappe role.
 */
export async function getUserRoles(
  subdomain: string,
  userEmail: string,
  timeout = 30_000,
): Promise<{ success: boolean; roles: string[]; role_profile_name: string | null }> {
  return serviceRequest(
    `/api/v1/get-user-roles/${encodeURIComponent(subdomain)}`,
    {
      method: 'POST',
      body: { user_email: userEmail },
      timeout,
    },
  )
}

/**
 * Create a tenant user from invite type or direct role assignment.
 */
export async function createTenantUser(
  subdomain: string,
  payload: {
    user_email: string
    first_name: string
    last_name?: string
    invite_type?: 'admin' | 'sales' | 'accounts' | 'projects' | 'member'
    role?: 'Sales User' | 'Accounts User' | 'Projects User' | 'Stock Manager' | 'Stock User'
  },
): Promise<{ success: boolean; user_email: string; roles: string[] }> {
  return serviceRequest(
    `/api/v1/create-tenant-user/${encodeURIComponent(subdomain)}`,
    {
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      timeout: 30_000,
    },
  )
}

/**
 * Change tenant user role and clear sessions.
 */
export async function changeTenantUserRole(
  subdomain: string,
  payload: { user_email: string; new_role: string },
): Promise<{ success: boolean; user_email: string; roles: string[] }> {
  return serviceRequest(
    `/api/v1/change-tenant-user-role/${encodeURIComponent(subdomain)}`,
    {
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      timeout: 30_000,
    },
  )
}

/**
 * Deprovision (delete) a tenant site. Destructive operation.
 */
export async function deprovisionTenantSite(subdomain: string): Promise<{ success: boolean; message: string }> {
  return serviceRequest<{ success: boolean; message: string }>(
    `/api/v1/deprovision/${encodeURIComponent(subdomain)}`,
    { method: 'DELETE', timeout: 60_000 },
  )
}

// ============================================================================
// Error Class
// ============================================================================

export class ProvisioningError extends Error {
  public status: number
  public data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ProvisioningError'
    this.status = status
    this.data = data
  }
}
