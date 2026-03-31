'use server'

import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { frappeRequest } from '@/app/lib/api'

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET

interface TenantInfo {
  name: string
  subdomain: string
  company_name: string
  owner_email: string
  site_url: string
  status: string
  creation: string
}

// ─── NEW-1 Fix: Strict allowlist for site/tenant names ───────────────────────
//
// Frappe site names are always: <subdomain>.<domain> using only alphanumerics,
// hyphens, and dots. Anything else is a shell injection attempt.
//
const SAFE_SITE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9.\-]{0,100}[a-zA-Z0-9]$/

function assertSafeSiteName(value: string, label: string): void {
  if (!SAFE_SITE_NAME_RE.test(value)) {
    throw new Error(
      `Invalid ${label}: "${value}" contains disallowed characters. Aborting to prevent shell injection.`
    )
  }
}

// ─── CVE-6 / NEW-2 Fix: Require System Manager role verified server-side ─────
//
// OLD isAdmin() checked if user_email cookie contained "@admin." — trivially
// spoofable. The new version calls NextAuth auth() then verifies the user's
// Frappe roles via the Master DB API.
//
async function assertIsSystemManager(): Promise<void> {
  // 1. Require a valid NextAuth session
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No authenticated session')
  }

  const email = session.user.email

  // 2. Verify the user actually has System Manager in Frappe
  try {
    const result = await frappeRequest(
      'frappe.client.get_value',
      'GET',
      {
        doctype: 'User',
        filters: email,
        fieldname: 'roles',
      },
      { useMasterCredentials: true }
    ) as { roles?: Array<{ role: string }> } | null

    const roles: string[] = (result?.roles || []).map((r) => r.role)
    if (!roles.includes('System Manager')) {
      throw new Error('Unauthorized: System Manager role required')
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      throw error
    }
    // Frappe lookup failure → deny by default (fail-secure)
    throw new Error('Unauthorized: Could not verify System Manager role')
  }
}

/**
 * List all tenant sites (System Manager only)
 */
export async function listAllTenants(): Promise<{ success: boolean; tenants?: TenantInfo[]; error?: string }> {
  try {
    await assertIsSystemManager()
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unauthorized' }
  }

  if (!API_KEY || !API_SECRET) {
    return { success: false, error: 'API credentials not configured' }
  }

  try {
    const authHeader = `token ${API_KEY}:${API_SECRET}`
    const response = await fetch(`${BASE_URL}/api/resource/Tenant?fields=["*"]&limit_page_length=100`, {
      headers: { 'Authorization': authHeader },
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch tenants' }
    }

    const data = await response.json()
    return { success: true, tenants: data.data || [] }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list tenants',
    }
  }
}

/**
 * Get tenant site status via Docker (System Manager only)
 * NEW-1 Fix: siteName is validated against strict allowlist before shell use.
 */
export async function getTenantSiteStatus(siteName: string): Promise<{
  success: boolean
  exists?: boolean
  database?: string
  apps?: string[]
  error?: string
}> {
  try {
    await assertIsSystemManager()
    // NEW-1: Validate siteName before ANY shell usage
    assertSafeSiteName(siteName, 'siteName')
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unauthorized' }
  }

  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    // siteName is safe (validated above) — use it in shell command
    const checkCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend ls sites/${siteName} 2>/dev/null`
    try {
      await execAsync(checkCmd)
    } catch {
      return { success: true, exists: false }
    }

    const appsCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} list-apps"`
    const { stdout: appsOutput } = await execAsync(appsCmd)
    const apps = appsOutput.trim().split('\n').filter(Boolean)
    const dbName = siteName.replace(/[.-]/g, '_')

    return { success: true, exists: true, database: dbName, apps }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get site status',
    }
  }
}

/**
 * Delete a tenant site (System Manager only)
 * NEW-1 Fix: both tenantName and siteName validated before shell use.
 */
export async function deleteTenantSite(tenantName: string, siteName: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await assertIsSystemManager()
    // NEW-1: Validate both args before ANY shell usage
    assertSafeSiteName(tenantName, 'tenantName')
    assertSafeSiteName(siteName, 'siteName')
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unauthorized' }
  }

  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'
  // DB_ROOT_PASSWORD must not be derived from user input — read from env only
  const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || ''

  if (!DB_ROOT_PASSWORD) {
    return { success: false, error: 'DB_ROOT_PASSWORD not configured' }
  }

  try {
    // siteName already validated — safe to interpolate
    const dropCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench drop-site ${siteName} --mariadb-root-password '${DB_ROOT_PASSWORD.replace(/'/g, "'\\''")}' --force"`
    await execAsync(dropCmd, { timeout: 60000 })

    if (API_KEY && API_SECRET) {
      const authHeader = `token ${API_KEY}:${API_SECRET}`
      await fetch(`${BASE_URL}/api/resource/Tenant/${encodeURIComponent(tenantName)}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader },
      })
    }

    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tenant site',
    }
  }
}

/**
 * Restart a tenant site (System Manager only)
 * NEW-1 Fix: siteName validated before shell use.
 */
export async function restartTenantSite(siteName: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await assertIsSystemManager()
    // NEW-1: Validate before shell use
    assertSafeSiteName(siteName, 'siteName')
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unauthorized' }
  }

  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    const restartCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} clear-cache"`
    await execAsync(restartCmd, { timeout: 30000 })
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restart tenant site',
    }
  }
}
