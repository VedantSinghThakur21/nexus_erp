import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { canAccessModule, canPerformAction } from '@/lib/role-permissions'
import { frappeRequest, tenantAdminRequest } from '@/app/lib/api'


/**
 * API Authentication & Authorization Utilities
 * ============================================
 *
 * Server-side utilities for protecting API routes.
 *
 * Security note: all role fetches use `tenantAdminRequest` (master credentials +
 * current-tenant site override) so that:
 *   1. The User doc is fetched from the correct site (not from master).
 *   2. Frappe's role-table masking does not hide roles from non-admin callers.
 */

type AuthResult = {
  authenticated: true
  userEmail: string
} | {
  authenticated: false
  response: NextResponse
}

type AuthzResult = {
  authorized: true
  userEmail: string
  roles: string[]
} | {
  authorized: false
  response: NextResponse
}

/**
 * Verify that the request comes from an authenticated user.
 * Checks for tenant API credentials or session cookie.
 * Returns the user email if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<AuthResult> {
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  const hasApiKey = cookieStore.get('tenant_api_key')?.value
  const hasSid = cookieStore.get('sid')?.value
  const hasSession = cookieStore.get('next-auth.session-token')?.value ||
    cookieStore.get('__Secure-next-auth.session-token')?.value

  if (!userEmail || (!hasApiKey && !hasSid && !hasSession)) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
  }

  return { authenticated: true, userEmail }
}

/**
 * Fetch user roles from the current tenant's Frappe site.
 *
 * Uses whitelisted `frappe.auth.get_roles` first, then falls back to Has Role
 * list query for resilience on restricted Frappe setups.
 */
async function getUserRolesFromFrappe(userEmail: string): Promise<string[]> {
  try {
    const authRolesResponse = await frappeRequest('frappe.auth.get_roles', 'GET') as any
    const authRoles = Array.isArray(authRolesResponse?.message) ? authRolesResponse.message : authRolesResponse
    if (Array.isArray(authRoles) && authRoles.length > 0) {
      return authRoles.filter((r: unknown): r is string => typeof r === 'string' && r !== 'All')
    }

    const roleRows = await tenantAdminRequest('frappe.client.get_list', 'GET', {
      doctype: 'Has Role',
      fields: ['role'],
      filters: [['parent', '=', userEmail], ['parenttype', '=', 'User']],
      limit_page_length: 200,
    }) as any[]

    if (Array.isArray(roleRows)) {
      return roleRows
        .map(r => r?.role)
        .filter((r: unknown): r is string => typeof r === 'string' && r !== 'All')
    }
  } catch (error) {
    console.error(`[API Auth] Failed to fetch roles for ${userEmail}:`, error)
  }
  return []
}

/**
 * Require authentication + module access for API routes
 */
export async function requireModuleAccess(module: string): Promise<AuthzResult> {
  const auth = await requireAuth()

  if (!auth.authenticated) {
    return { authorized: false, response: auth.response }
  }

  const roles = await getUserRolesFromFrappe(auth.userEmail)

  if (!canAccessModule(module, roles)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: `Access denied to module: ${module}`, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  return { authorized: true, userEmail: auth.userEmail, roles }
}

/**
 * Require authentication + specific action permission for API routes
 */
export async function requireActionPermission(module: string, action: string): Promise<AuthzResult> {
  const auth = await requireAuth()

  if (!auth.authenticated) {
    return { authorized: false, response: auth.response }
  }

  const roles = await getUserRolesFromFrappe(auth.userEmail)

  if (!canPerformAction(module, action, roles)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: `Permission denied: ${action} on ${module}`, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  return { authorized: true, userEmail: auth.userEmail, roles }
}

/**
 * Require System Manager role for API routes
 */
export async function requireSystemManager(): Promise<AuthzResult> {
  const auth = await requireAuth()

  if (!auth.authenticated) {
    return { authorized: false, response: auth.response }
  }

  const roles = await getUserRolesFromFrappe(auth.userEmail)

  if (!roles.includes('System Manager')) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'System Manager role required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  return { authorized: true, userEmail: auth.userEmail, roles }
}
