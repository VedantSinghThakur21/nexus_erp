/**
 * API Route: /api/user/roles
 *
 * Fetches current user's roles from Frappe ERPNext backend.
 * Uses multiple fallback strategies:
 *   1. tenantAdminRequest → frappe.client.get_list on Has Role
 *   2. role_profile_name mapping
 *   3. Provisioning service (ignore_permissions) as last resort
 *
 * Security fix: always uses master credentials against the TENANT site so that
 * (a) the user doc actually exists on that site, and
 * (b) the roles child table is not masked by Frappe's per-user permission rules.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { frappeRequest, getTenantContext, tenantAdminRequest } from '@/app/lib/api'
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

    // ── Step 2: Fetch roles from Has Role child table ────────────────────────
    let roles: string[] = []
    let roleProfileName: string | null = null

    try {
      const roleRows = await tenantAdminRequest('frappe.client.get_list', 'GET', {
        doctype: 'Has Role',
        fields: ['role'],
        filters: [['parent', '=', userEmail], ['parenttype', '=', 'User']],
        limit_page_length: 200,
      }) as any[]

      if (Array.isArray(roleRows)) {
        roles = roleRows
          .map((row: any) => row?.role)
          .filter((r: unknown): r is string => typeof r === 'string' && r !== 'All')
      }
    } catch (rolesListErr: any) {
      const message = String(rolesListErr?.message || 'Unknown error')
      if (shouldLogRoleApi(`roles-list-failed:${userEmail}:${message}`, 5 * 60 * 1000)) {
        console.warn(`[/api/user/roles] Has Role lookup failed for ${userEmail}:`, message)
      }
    }

    // ── Step 2b: Optional role profile fetch via get_value ───────────────────
    if (!roleProfileName) {
      try {
        const profile = await tenantAdminRequest('frappe.client.get_value', 'GET', {
          doctype: 'User',
          filters: { name: userEmail },
          fieldname: ['role_profile_name'],
        }) as any
        roleProfileName = profile?.role_profile_name || profile?.message?.role_profile_name || null
      } catch {
        // Optional enrichment only; continue without failing.
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
    // Return no roles if all strategies fail (do not over-grant fallback access).
    if (roles.length === 0) {
      console.error(
        `[/api/user/roles] ⚠️  ALL role-fetch strategies failed for ${userEmail}. ` +
        `Returning empty role set. Check that the user exists on the tenant site ` +
        `and that PROVISIONING_SERVICE_URL is reachable.`
      )
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
