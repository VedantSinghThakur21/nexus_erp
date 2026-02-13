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
    // Fetch user from Frappe
    const response = await frappeRequest(
      'frappe.client.get',
      'POST',
      {
        doctype: 'User',
        name: 'frappe.session.user',
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
