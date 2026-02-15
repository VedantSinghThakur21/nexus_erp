/**
 * Server Actions - User Role Management
 * 
 * Server-side utilities for checking user roles and permissions
 */
'use server'

import { frappeRequest } from '@/app/lib/api'
import { canAccessModule, getPrimaryRole } from '@/lib/role-permissions'
import { redirect } from 'next/navigation'

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

    // Now fetch full user details with roles using the actual email
    const response = await frappeRequest(
      'frappe.client.get',
      'POST',
      {
        doctype: 'User',
        name: userEmail,
        fields: JSON.stringify(['name', 'roles']),
      }
    ) as any

    const user = response.message || response

    return Array.isArray(user.roles)
      ? user.roles.map((r: any) => r.role || r.name)
      : []
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
 */
export async function updateUserRoles(email: string, roles: string[]) {
  try {
    // 1. Fetch current user to get their ID/Name (usually email for System Users)
    // We already have email passed in, which is the 'name' of the User doctype

    // 2. Prepare the roles structure for Frappe
    // Frappe expects a list of dicts: [{"role": "System Manager"}, ...]
    const rolesList = roles.map(role => ({ role }))

    // 3. Update the user
    // We use frappe.client.set_value or save logic
    // But child tables are tricky. It's often better to save the whole doc or use a specific setter.
    // Let's try writing to the 'roles' child table directly if possible, or updating the doc.

    // Best approach for Frappe API: update the document with the new child table
    const response = await frappeRequest(
      'frappe.client.set_value',
      'POST',
      {
        doctype: 'User',
        name: email,
        fieldname: 'roles',
        value: JSON.stringify(rolesList)
      }
    ) as any

    if (response) {
      return { success: true }
    } else {
      console.error('Failed to update roles', response)
      return { success: false, error: 'Failed to update roles in backend' }
    }
  } catch (error: any) {
    console.error('Error updating user roles:', error)
    return { success: false, error: error.message || 'Failed to update roles' }
  }
}

/**
 * Get roles for a specific user
 */
export async function getUserRolesForUser(email: string): Promise<string[]> {
  try {
    const response = await frappeRequest(
      'frappe.client.get',
      'POST',
      {
        doctype: 'User',
        name: email,
        fields: JSON.stringify(['name', 'roles']),
      }
    ) as any

    const user = response.message || response

    return Array.isArray(user.roles)
      ? user.roles.map((r: any) => r.role || r.name)
      : []
  } catch (error) {
    console.error(`[getUserRolesForUser] Failed to fetch roles for ${email}:`, error)
    return []
  }
}
