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
const PROVISIONING_API_SECRET = process.env.PROVISIONING_API_SECRET || 'change-me-in-production'

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
        'X-Provisioning-Secret': PROVISIONING_API_SECRET,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ProvisioningError(
        data.detail || `Service returned ${response.status}`,
        response.status,
        data,
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
    { timeout: 10_000 },
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
      timeout: 180_000, // 3 minutes max for full provisioning
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
