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
    // Prefer tenant-scoped credentials when operating on a tenant site.
    // For root/master context this still falls back to master credentials.
    const reqOpts = { siteOverride }

    // Step 1: Fetch full user doc (child tables included)
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

    // Step 4: Save the full doc
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
 *
 * Strategy:
 *   1. Provisioning service (ignore_permissions — most reliable)
 *   2. role_profile_name → static mapping fallback
 *   3. frappe.client.get as last resort (often returns empty due to Frappe
 *      permission restrictions on the Has Role child table)
 */
export async function getUserRolesForUser(email: string): Promise<string[]> {
  const PROFILE_ROLES: Record<string, string[]> = {
    'Administrator': ['System Manager'],
    'System Manager': ['System Manager'],
    'Sales Manager': ['Sales Manager', 'Sales User'],
    'Sales User': ['Sales User'],
    'Accounts Manager': ['Accounts Manager', 'Accounts User'],
    'Accounts User': ['Accounts User'],
    'Projects Manager': ['Projects Manager', 'Projects User'],
    'Projects User': ['Projects User'],
    'Standard User': ['Employee', 'Sales User'],
    'Employee': ['Employee', 'Sales User'],
  }

  // ── 1. Provisioning service (primary) ──────────────────────────────────────
  try {
    const headersList = await headers()
    const subdomain = headersList.get('x-tenant-id')
    if (subdomain && subdomain !== 'master') {
      const { getUserRoles: getProvRoles } = await import('@/lib/provisioning-client')
      const provData = await getProvRoles(subdomain, email)
      const provRoles = (provData.roles || []).filter(
        (r: string) => typeof r === 'string' && r !== 'All'
      )
      if (provRoles.length > 0) {
        return provRoles
      }
      // If provisioning returned no roles but has a role_profile_name, derive roles
      if (provData.role_profile_name) {
        const derived = PROFILE_ROLES[provData.role_profile_name] || []
        if (derived.length > 0) return derived
      }
    }
  } catch (provErr: any) {
    console.warn(`[getUserRolesForUser] Provisioning failed for ${email}:`, provErr?.message)
  }

  // ── 2. role_profile_name fallback via get_value ────────────────────────────
  try {
    const siteOverride = await getTenantSiteName()
    const profile = await frappeRequest('frappe.client.get_value', 'GET', {
      doctype: 'User',
      filters: JSON.stringify({ name: email }),
      fieldname: JSON.stringify(['role_profile_name']),
    }, { siteOverride }) as any
    const rpn = profile?.message?.role_profile_name || profile?.role_profile_name
    if (rpn) {
      const derived = PROFILE_ROLES[rpn] || []
      if (derived.length > 0) return derived
    }
  } catch {
    // Optional enrichment — continue to next fallback
  }

  // ── 3. frappe.client.get (last resort — often empty for non-admin users) ──
  try {
    const siteOverride = await getTenantSiteName()
    const response = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'User',
      name: email,
    }, { siteOverride }) as any

    const user = response?.message || response

    if (Array.isArray(user?.roles) && user.roles.length > 0) {
      return user.roles
        .map((r: any) => r.role || r.name)
        .filter((r: string) => r && r !== 'All')
    }
  } catch (error) {
    console.error(`[getUserRolesForUser] All strategies failed for ${email}:`, error)
  }

  return []
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
