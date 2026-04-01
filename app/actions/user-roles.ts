/**
 * Server Actions - User Role Management
 * 
 * Server-side utilities for checking user roles and permissions
 */
'use server'

import { frappeRequest } from '@/app/lib/api'
import { canAccessModule, getPrimaryRole, getAccessibleModules } from '@/lib/role-permissions'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// Resolve the current tenant's Frappe site name for master-credential operations
async function getTenantSiteName(): Promise<string | undefined> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId || tenantId === 'master') return undefined
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  return process.env.NODE_ENV === 'production'
    ? `${tenantId}.${rootDomain}`
    : `${tenantId}.localhost`
}

/**
 * Fetch current user's roles from Frappe backend
 */
export async function getUserRoles(): Promise<string[]> {
  try {
    // First get the current logged-in user's email
    const userInfoResponse = await frappeRequest(
      'frappe.auth.get_logged_user',
      'GET'
    ) as any

    const userEmail = userInfoResponse.message || userInfoResponse

    if (!userEmail) {
      console.warn('[getUserRoles] No user logged in')
      return []
    }

    // Use master credentials to fetch roles since Frappe REST API masks
    // the 'roles' child table when a non-master user reads their own profile.
    return await getUserRolesForUser(userEmail)
  } catch (error) {
    console.error('[getUserRoles] Failed to fetch roles:', error)
    return []
  }
}

/**
 * Check if current user can access a module
 * Throws redirect if access denied
 */
export async function requireModuleAccess(module: string): Promise<void> {
  const roles = await getUserRoles()

  if (!canAccessModule(module, roles)) {
    const primaryRole = getPrimaryRole(roles)
    redirect(`/access-denied?module=${module}&role=${primaryRole}`)
  }
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: string): Promise<boolean> {
  const roles = await getUserRoles()
  return roles.includes(role)
}

/**
 * Check if user is System Manager
 */
export async function isSystemManager(): Promise<boolean> {
  return await hasRole('System Manager')
}

/**
 * Update user roles
 * 
 * Uses frappe.client.save (requires System Manager) to replace the user's
 * roles child table and clear role_profile_name so it doesn't override.
 * Falls back to the provisioning service if direct save fails.
 */
export async function updateUserRoles(email: string, roles: string[]) {
  try {
    const siteOverride = await getTenantSiteName()
    const reqOpts = { useMasterCredentials: true as const, siteOverride }

    // Step 1: Fetch full user doc with master credentials (child tables included)
    const docResponse = await frappeRequest('frappe.client.get', 'POST', {
      doctype: 'User',
      name: email,
    }, reqOpts) as any
    const userDoc = docResponse?.message || docResponse

    if (!userDoc || !userDoc.name) {
      throw new Error(`User ${email} not found`)
    }

    // Step 2: Clear role_profile_name so it doesn't silently override explicit roles
    userDoc.role_profile_name = null

    // Step 3: Replace roles child table with new set
    userDoc.roles = roles.map(role => ({
      doctype: 'Has Role',
      role,
      parent: email,
      parenttype: 'User',
      parentfield: 'roles',
    }))

    // Step 4: Save the full doc with master credentials
    await frappeRequest('frappe.client.save', 'POST', { doc: userDoc }, reqOpts)

    console.log(`[updateUserRoles] Saved roles for ${email}:`, roles)
    return { success: true }
  } catch (error: any) {
    console.error('[updateUserRoles] Direct save failed, trying provisioning service:', error.message)

    // Fallback: provisioning service (ignore_permissions)
    try {
      const headersList = await headers()
      const subdomain = headersList.get('x-tenant-id')
      if (!subdomain) throw new Error('No subdomain context')

      const { assignUserRoles } = await import('@/lib/provisioning-client')
      await assignUserRoles(subdomain, email, roles)
      console.log(`[updateUserRoles] Provisioning service assigned roles for ${email}`)
      return { success: true }
    } catch (provErr: any) {
      console.error('[updateUserRoles] Both methods failed:', provErr.message)
      return { success: false, error: `Failed to update roles: ${error.message}` }
    }
  }
}

/**
 * Get roles for a specific user (and their module access count)
 */
export async function getUserRolesForUser(email: string): Promise<string[]> {
  try {
    const siteOverride = await getTenantSiteName()
    // Use master credentials so this works regardless of the calling user's role.
    // Use get_list on 'Has Role' instead of fetching the full 'User' doc via POST
    // to prevent Node.js fetch/stream timeouts on the Next.js server.
    const response = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Has Role',
      filters: JSON.stringify([['parent', '=', email], ['parenttype', '=', 'User']]),
      fields: JSON.stringify(['role']),
      limit_page_length: 100,
    }, { useMasterCredentials: true, siteOverride }) as any

    const roles = Array.isArray(response) ? response : (response?.message || [])

    if (roles.length > 0) {
      return roles
        .map((r: any) => r.role || r.name)
        .filter((r: string) => r && r !== 'All')
    }
    return []
  } catch (error) {
    console.error(`[getUserRolesForUser] Failed to fetch roles for ${email}:`, error)
    return []
  }
}

/**
 * Get roles + accessible module count for a user (used by team page)
 */
export async function getUserAccessSummary(email: string): Promise<{
  roles: string[]
  modulesCount: number
  hasBrokenAccess: boolean
}> {
  const roles = await getUserRolesForUser(email)
  const modules = getAccessibleModules(roles)
  return {
    roles,
    modulesCount: modules.length,
    hasBrokenAccess: roles.length === 0,
  }
}
