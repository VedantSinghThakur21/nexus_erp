/**
 * API Route: /api/user/roles
 *
 * Fetches current user's roles from Frappe ERPNext backend.
 * Uses multiple fallback strategies:
 *   1. tenantAdminRequest (master creds + tenant site) → frappe.client.get User doc
 *   2. role_profile_name mapping
 *   3. Provisioning service (ignore_permissions) as last resort
 *
 * Security fix: always uses master credentials against the TENANT site so that
 * (a) the user doc actually exists on that site, and
 * (b) the roles child table is not masked by Frappe's per-user permission rules.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { frappeRequest, tenantAdminRequest, getTenantContext } from '@/app/lib/api'
import { requireAuth } from '@/app/api/_lib/auth'

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

const roleApiLogLastSeen = new Map<string, number>()

function shouldLogRoleApi(key: string, throttleMs: number): boolean {
  const now = Date.now()
  const last = roleApiLogLastSeen.get(key)
  if (last && now - last < throttleMs) {
    return false
  }
  roleApiLogLastSeen.set(key, now)
  return true
}

export async function GET(_request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

  try {
    const cookieStore = await cookies()
    const cookieEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

    // ── Step 1: Determine the user's email ──────────────────────────────────
    let userEmail: string | null = null

    try {
      const userInfoResponse = await frappeRequest('frappe.auth.get_logged_user', 'GET') as any
      const raw = userInfoResponse?.message || userInfoResponse || null
      if (typeof raw === 'string' && raw.includes('@')) {
        userEmail = raw
      }
    } catch {
      // Swallow — fallback to cookie below
    }

    // Fallback: use the email stored in cookies during login
    if (!userEmail && cookieEmail) {
      userEmail = cookieEmail
    }

    if (!userEmail) {
      console.warn('[/api/user/roles] Could not determine user email — no cookie or Frappe session')
      throw new Error('No user logged in')
    }

    // ── Step 2: Fetch roles using master credentials → tenant site ──────────
    // SECURITY FIX: `tenantAdminRequest` sends master API key with X-Frappe-Site-Name
    // pointing at the CURRENT TENANT site (from x-tenant-id middleware header).
    // This ensures:
    //   • The user document is found (it lives on the tenant site, not master).
    //   • The `roles` child table is visible (non-admin credentials mask it).
    let roles: string[] = []
    let roleProfileName: string | null = null

    try {
      const userDoc = await tenantAdminRequest('frappe.client.get', 'POST', {
        doctype: 'User',
        name: userEmail,
      }) as any

      const user = userDoc?.message || userDoc
      roleProfileName = user?.role_profile_name || null

      if (Array.isArray(user?.roles) && user.roles.length > 0) {
        roles = user.roles
          .map((r: any) => r.role || r.name)
          .filter((r: string) => r && r !== 'All')
        if (process.env.NODE_ENV === 'development') {
          console.log(`[/api/user/roles] Fetched ${roles.length} roles for ${userEmail} via tenantAdminRequest`)
        }
      } else {
        if (shouldLogRoleApi(`empty-roles:${userEmail}`, 5 * 60 * 1000)) {
          console.warn(`[/api/user/roles] User doc returned empty roles array for ${userEmail}`)
        }
      }
    } catch (getErr: any) {
      const message = String(getErr?.message || 'Unknown error')
      if (message.includes('AuthenticationError')) {
        if (shouldLogRoleApi(`tenant-admin-auth:${userEmail}`, 10 * 60 * 1000)) {
          console.warn(`[/api/user/roles] tenantAdminRequest auth failed for ${userEmail}; using fallback path`)
        }
      } else {
        console.error(`[/api/user/roles] tenantAdminRequest failed for ${userEmail}:`, message)
      }
    }

    // ── Step 3: If roles empty but role_profile_name set → derive roles ──────
    if (roles.length === 0 && roleProfileName) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[/api/user/roles] Deriving roles from profile "${roleProfileName}" for ${userEmail}`)
      }
      roles = PROFILE_ROLES[roleProfileName] || []
    }

    // ── Step 4: Provisioning service fallback (ignore_permissions) ───────────
    if (roles.length === 0) {
      try {
        const context = await getTenantContext()
        if (context.subdomain) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[/api/user/roles] Trying provisioning service for ${userEmail} on ${context.subdomain}`)
          }
          const { getUserRoles } = await import('@/lib/provisioning-client')
          const provRoleData = await getUserRoles(context.subdomain, userEmail)
          roles = provRoleData.roles || []
          roleProfileName = provRoleData.role_profile_name || null

          if (roles.length === 0 && roleProfileName) {
            roles = PROFILE_ROLES[roleProfileName] || []
          }

          if (roles.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[/api/user/roles] Got ${roles.length} roles from provisioning service for ${userEmail}`)
            }
          }
        }
      } catch (provErr: any) {
        const message = String(provErr?.message || 'Unknown error')
        if (shouldLogRoleApi(`prov-fallback-failed:${userEmail}:${message}`, 5 * 60 * 1000)) {
          console.warn(`[/api/user/roles] Provisioning service fallback failed:`, message)
        }
      }
    }

    // ── Step 5: Absolute last resort ─────────────────────────────────────────
    // Give minimum access so the UI doesn't fully break, but log loudly.
    if (roles.length === 0) {
      console.error(
        `[/api/user/roles] ⚠️  ALL role-fetch strategies failed for ${userEmail}. ` +
        `Defaulting to ['Sales User']. Check that the user exists on the tenant site ` +
        `and that PROVISIONING_SERVICE_URL is reachable.`
      )
      roles = ['Sales User']
    }

    return NextResponse.json(
      {
        success: true,
        roles,
        roleProfileName,
        user: {
          name: userEmail,
          email: userEmail,
        },
      },
      {
        headers: {
          // Prevent any CDN or browser from caching role responses
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (error: any) {
    console.error('[API /user/roles] Failed to fetch roles:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch user roles',
        roles: [],
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
