import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { canAccessModule, canPerformAction } from '@/lib/role-permissions'
import { getTenantContext, tenantAdminRequest } from '@/app/lib/api'


/**
 * API Authentication & Authorization Utilities
 * ============================================
 *
 * Server-side utilities for protecting API routes.
 *
 * Role fetches primarily use the provisioning service (ignore_permissions=True)
 * with a fallback to direct Has Role queries via tenant credentials.
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
 * Primary: provisioning service (uses ignore_permissions=True).
 * Fallback: direct Has Role child-table query via tenant credentials.
 */
async function getUserRolesFromFrappe(userEmail: string): Promise<string[]> {
  // ── Primary: provisioning service ──────────────────────────────────────────
  try {
    const context = await getTenantContext()
    if (context.subdomain) {
      const { getUserRoles } = await import('@/lib/provisioning-client')
      const provRoleData = await getUserRoles(context.subdomain, userEmail)
      if (Array.isArray(provRoleData.roles)) {
        const roles = provRoleData.roles.filter((r): r is string => typeof r === 'string' && r !== 'All')
        if (roles.length > 0) return roles
      }
    }
  } catch {
    // Provisioning service unavailable — fall through to direct query.
  }

  // ── Fallback: direct Has Role query ────────────────────────────────────────
  try {
    const roleRows = await tenantAdminRequest('frappe.client.get_list', 'GET', {
      doctype: 'Has Role',
      fields: ['role'],
      filters: [['parent', '=', userEmail], ['parenttype', '=', 'User']],
      limit_page_length: 200,
    }) as any[]

    if (Array.isArray(roleRows)) {
      const roles = roleRows
        .map(r => r?.role)
        .filter((r: unknown): r is string => typeof r === 'string' && r !== 'All')

      if (roles.length > 0) return roles
    }
  } catch (error) {
    const message = String((error as Error)?.message || '')
    if (!message.includes('PermissionError')) {
      console.error(`[API Auth] Failed to fetch roles for ${userEmail}:`, error)
    }
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
