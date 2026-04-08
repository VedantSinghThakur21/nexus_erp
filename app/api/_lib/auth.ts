import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { canAccessModule, canPerformAction } from '@/lib/role-permissions'
import { headers } from 'next/headers'
import { frappeRequest } from '@/app/lib/api'

/**
 * API Authentication & Authorization Utilities
 * ============================================
 * 
 * Server-side utilities for protecting API routes.
 */

interface AuthResult {
  authenticated: true
  userEmail: string
} | {
  authenticated: false
  response: NextResponse
}

interface AuthzResult {
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
 * Fetch user roles from Frappe backend
 */
async function getUserRolesFromFrappe(userEmail: string): Promise<string[]> {
  try {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    let siteOverride: string | undefined

    if (tenantId && tenantId !== 'master') {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
      siteOverride = process.env.NODE_ENV === 'production'
        ? `${tenantId}.${rootDomain}`
        : `${tenantId}.localhost`
    }

    const response = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'User',
      name: userEmail,
    }, { siteOverride }) as Record<string, unknown>

    const user = response?.message || response

    if (user && Array.isArray((user as Record<string, unknown>).roles)) {
      const roles = (user as { roles: Array<{ role?: string; name?: string }> }).roles
      return roles
        .map(r => r.role || r.name)
        .filter((r): r is string => !!r && r !== 'All')
    }

    return []
  } catch (error) {
    console.error(`[API Auth] Failed to fetch roles for ${userEmail}:`, error)
    return []
  }
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
