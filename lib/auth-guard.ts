/**
 * Server-Side Authentication & Authorization Guards
 * ==================================================
 * 
 * Utilities for enforcing auth/authz in:
 * - Server Components (pages)
 * - Server Actions
 * - API Route Handlers
 */

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache as reactCache } from 'react'
import { frappeRequest, getTenantContext } from '@/app/lib/api'
import { canAccessModule } from '@/lib/role-permissions'

// ============================================================================
// TYPES
// ============================================================================

export interface AuthSession {
  isAuthenticated: boolean
  userEmail: string | null
  roles: string[]
  tenant: string
  hasCredentials: boolean
}

export type AuthResult = {
  success: true
  session: AuthSession
} | {
  success: false
  error: string
  status: number
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Get current authentication session from cookies
 * Returns null if not authenticated
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const headersList = await headers()
  
  // Check for valid auth mechanisms
  const nextAuthSession = 
    cookieStore.get('next-auth.session-token')?.value ||
    cookieStore.get('__Secure-next-auth.session-token')?.value
  
  const tenantApiKey = cookieStore.get('tenant_api_key')?.value
  const tenantApiSecret = cookieStore.get('tenant_api_secret')?.value
  const frappeSession = cookieStore.get('sid')?.value
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  
  const hasValidAuth = 
    !!nextAuthSession ||
    !!(tenantApiKey && tenantApiSecret) ||
    (!!frappeSession && frappeSession !== 'Guest')
  
  if (!hasValidAuth) {
    return null
  }
  
  const tenant = headersList.get('x-tenant-id') || 'master'
  
  return {
    isAuthenticated: true,
    userEmail: userEmail || null,
    roles: [], // Roles loaded separately via getUserRoles()
    tenant,
    hasCredentials: !!(tenantApiKey && tenantApiSecret),
  }
}

/**
 * Validate the Frappe backend session is still active.
 * Call after login or token refresh — not on every navigation.
 */
export async function validateFrappeSession(callbackUrl?: string): Promise<void> {
  try {
    await frappeRequest('frappe.auth.get_logged_user', 'GET')
  } catch (error: unknown) {
    const message = String(error instanceof Error ? error.message : error || '')
    if (
      message.includes('SESSION_EXPIRED') ||
      message.includes('AuthenticationError') ||
      message.toLowerCase().includes('session expired')
    ) {
      const loginUrl = callbackUrl
        ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}&reason=session_expired`
        : '/login?reason=session_expired'
      redirect(loginUrl)
    }
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use in Server Components
 */
export async function requireAuth(callbackUrl?: string): Promise<AuthSession> {
  const session = await getAuthSession()
  
  if (!session) {
    const loginUrl = callbackUrl 
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}&reason=unauthenticated`
      : '/login?reason=unauthenticated'
    redirect(loginUrl)
  }

  return session
}

/**
 * Require authentication for API routes
 * Returns 401 JSON response if not authenticated
 */
export async function requireAuthAPI(): Promise<AuthResult> {
  const session = await getAuthSession()
  
  if (!session) {
    return {
      success: false,
      error: 'Authentication required',
      status: 401,
    }
  }
  
  return {
    success: true,
    session,
  }
}

// ============================================================================
// AUTHORIZATION - ROLE CHECKS
// ============================================================================

/**
 * Fetch user's roles from Frappe backend
 * Cached per request via React cache
 */
async function resolveUserRoles(userEmail?: string): Promise<string[]> {
  const cookieStore = await cookies()
  const email = userEmail || cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  
  if (!email) {
    return []
  }
  
  // Primary: provisioning service (uses ignore_permissions=True on Frappe side).
  // We intentionally DO NOT call `frappe.client.get_list` on the `Has Role` DocType
  // here because Frappe frequently blocks that child table over REST (even for
  // privileged tenant users), causing noisy 403 PermissionError spam.
  try {
    const tenant = await getTenantContext()
    if (tenant.subdomain) {
      const { getUserRoles: getProvisionedUserRoles } = await import('@/lib/provisioning-client')
      const roleData = await getProvisionedUserRoles(tenant.subdomain, email)
      if (Array.isArray(roleData.roles)) {
        const roles = roleData.roles.filter((r): r is string => typeof r === 'string' && r !== 'All')
        if (roles.length > 0) return roles
      }
    }
  } catch (error) {
    console.error(`[getUserRoles] Provisioning roles fetch failed for ${email}:`, (error as Error)?.message || error)
  }

  // Fail closed: returning no roles is safer than over-granting.
  return []
}

/** Dedupes role fetches within a single RSC/request. */
export const getUserRoles = reactCache(resolveUserRoles)

/**
 * Check if user has a specific role
 */
export async function hasRole(role: string, userEmail?: string): Promise<boolean> {
  const roles = await getUserRoles(userEmail)
  return roles.includes(role)
}

/**
 * Check if user is System Manager
 */
export async function isSystemManager(userEmail?: string): Promise<boolean> {
  return hasRole('System Manager', userEmail)
}

/**
 * Require a specific role - redirects to access-denied if not authorized
 */
export async function requireRole(role: string, userEmail?: string): Promise<void> {
  const hasRequiredRole = await hasRole(role, userEmail)
  
  if (!hasRequiredRole) {
    redirect(`/access-denied?required=${encodeURIComponent(role)}`)
  }
}

/**
 * Require System Manager role
 */
export async function requireSystemManager(userEmail?: string): Promise<void> {
  const isAdmin = await isSystemManager(userEmail)
  
  if (!isAdmin) {
    redirect('/access-denied?required=System%20Manager')
  }
}

// ============================================================================
// AUTHORIZATION - MODULE ACCESS
// ============================================================================

/**
 * Check if user can access a module
 */
export async function canUserAccessModule(module: string, userEmail?: string): Promise<boolean> {
  const roles = await getUserRoles(userEmail)
  return canAccessModule(module, roles)
}

/**
 * Require module access - redirects if not authorized
 * Use in page Server Components
 */
export async function requireModuleAccess(module: string): Promise<string[]> {
  const session = await getAuthSession()
  
  if (!session) {
    redirect('/login?reason=unauthenticated')
  }
  
  const roles = await getUserRoles(session.userEmail || undefined)
  
  if (!canAccessModule(module, roles)) {
    redirect(`/access-denied?module=${encodeURIComponent(module)}`)
  }
  
  return roles
}

/**
 * Require module access for API routes
 */
export async function requireModuleAccessAPI(module: string): Promise<AuthResult & { roles?: string[] }> {
  const authResult = await requireAuthAPI()
  
  if (!authResult.success) {
    return authResult
  }
  
  const roles = await getUserRoles(authResult.session.userEmail || undefined)
  
  if (!canAccessModule(module, roles)) {
    return {
      success: false,
      error: `Access denied to module: ${module}`,
      status: 403,
    }
  }
  
  return {
    ...authResult,
    roles,
  }
}

// ============================================================================
// ADMIN ROUTES GUARD
// ============================================================================

/**
 * Require admin access for sensitive operations
 * Combines authentication + System Manager role check
 */
export async function requireAdmin(): Promise<{ session: AuthSession; userEmail: string }> {
  const session = await requireAuth()
  
  if (!session.userEmail) {
    redirect('/login?reason=unauthenticated')
  }
  
  await requireSystemManager(session.userEmail)
  
  return { session, userEmail: session.userEmail }
}

/**
 * Admin check for API routes
 */
export async function requireAdminAPI(): Promise<AuthResult & { userEmail?: string }> {
  const authResult = await requireAuthAPI()
  
  if (!authResult.success) {
    return authResult
  }
  
  if (!authResult.session.userEmail) {
    return {
      success: false,
      error: 'User email not found in session',
      status: 401,
    }
  }
  
  const isAdmin = await isSystemManager(authResult.session.userEmail)
  
  if (!isAdmin) {
    return {
      success: false,
      error: 'System Manager role required',
      status: 403,
    }
  }
  
  return {
    ...authResult,
    userEmail: authResult.session.userEmail,
  }
}

// ============================================================================
// UTILITY: GET MODULE FROM PATHNAME
// ============================================================================

/**
 * Extract module name from URL pathname
 */
export function getModuleFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/(tenant\/)?(dashboard|quotations|sales-orders|invoices|payments|projects|bookings|catalogue|crm|operators|agents|inspections|pricing-rules|team|settings|admin-tenants)/)
  return match ? match[2] : null
}
