'use server'

import { cookies } from 'next/headers'

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

/**
 * Check if user is admin (has access to master site)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('user_email')?.value
    
    // Simple check: admin user must be from localhost or have specific email
    return userEmail === 'administrator' || userEmail?.includes('@admin.')
  } catch {
    return false
  }
}

/**
 * List all tenant sites (admin only)
 */
export async function listAllTenants(): Promise<{ success: boolean; tenants?: TenantInfo[]; error?: string }> {
  if (!API_KEY || !API_SECRET) {
    return { success: false, error: 'API credentials not configured' }
  }

  try {
    const authHeader = `token ${API_KEY}:${API_SECRET}`
    const response = await fetch(`${BASE_URL}/api/resource/Tenant?fields=["*"]&limit_page_length=100`, {
      headers: {
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch tenants' }
    }

    const data = await response.json()
    return {
      success: true,
      tenants: data.data || [],
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list tenants',
    }
  }
}

/**
 * Get tenant site status from Docker
 */
export async function getTenantSiteStatus(siteName: string): Promise<{ 
  success: boolean
  exists?: boolean
  database?: string
  apps?: string[]
  error?: string 
}> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    // Check if site exists
    const checkCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend ls sites/${siteName} 2>/dev/null`
    try {
      await execAsync(checkCmd)
    } catch {
      return { success: true, exists: false }
    }

    // Get site apps
    const appsCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} list-apps"`
    const { stdout: appsOutput } = await execAsync(appsCmd)
    const apps = appsOutput.trim().split('\n').filter(Boolean)

    // Get database name from site config
    const dbName = siteName.replace(/[.-]/g, '_')

    return {
      success: true,
      exists: true,
      database: dbName,
      apps,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Delete a tenant site (admin only)
 */
export async function deleteTenantSite(tenantName: string, siteName: string): Promise<{ 
  success: boolean
  error?: string 
}> {
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'
  const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'admin'

  try {
    // Drop the site and database
    const dropCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench drop-site ${siteName} --mariadb-root-password '${DB_ROOT_PASSWORD}' --force"`
    
    await execAsync(dropCmd, { timeout: 60000 })

    // Delete Tenant record from master site
    if (API_KEY && API_SECRET) {
      const authHeader = `token ${API_KEY}:${API_SECRET}`
      await fetch(`${BASE_URL}/api/resource/Tenant/${tenantName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
      })
    }

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete tenant site',
    }
  }
}

/**
 * Restart a tenant site
 */
export async function restartTenantSite(siteName: string): Promise<{ 
  success: boolean
  error?: string 
}> {
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    // Restart the site (clears cache)
    const restartCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} clear-cache"`
    
    await execAsync(restartCmd, { timeout: 30000 })

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to restart tenant site',
    }
  }
}
