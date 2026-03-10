/**
 * API Route: /api/user/roles
 * 
 * Fetches current user's roles from Frappe ERPNext backend.
 * Uses multiple fallback strategies:
 *   1. API key auth → frappe.client.get for User doc
 *   2. role_profile_name mapping
 *   3. Provisioning service (ignore_permissions) as last resort
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { frappeRequest, getTenantContext } from '@/app/lib/api'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const cookieEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

    // Step 1: Determine the user's email
    let userEmail: string | null = null

    try {
      const userInfoResponse = await frappeRequest(
        'frappe.auth.get_logged_user',
        'GET'
      ) as any
      userEmail = userInfoResponse?.message || userInfoResponse || null
      if (typeof userEmail !== 'string' || !userEmail.includes('@')) {
        userEmail = null
      }
    } catch (authErr: any) {
      console.warn('[API /user/roles] get_logged_user failed:', authErr.message)
    }

    // Fallback: use the email stored in cookies during login
    if (!userEmail && cookieEmail) {
      console.log('[API /user/roles] Using cookie email fallback:', cookieEmail)
      userEmail = cookieEmail
    }

    if (!userEmail) {
      throw new Error('No user logged in')
    }

    console.log('[API /user/roles] Fetching roles for:', userEmail)

    // Step 2: Fetch roles from Frappe User doc
    let roles: string[] = []
    let roleProfileName: string | null = null

    try {
      const userDoc = await frappeRequest(
        'frappe.client.get',
        'POST',
        {
          doctype: 'User',
          name: userEmail,
        }
      ) as any

      const user = userDoc?.message || userDoc
      roleProfileName = user?.role_profile_name || null

      console.log('[API /user/roles] User doc fetched. role_profile_name:', roleProfileName)
      console.log('[API /user/roles] Raw roles count:', user?.roles?.length)

      if (Array.isArray(user?.roles)) {
        roles = user.roles
          .map((r: any) => r.role || r.name)
          .filter((r: string) => r && r !== 'All')
        console.log('[API /user/roles] Extracted roles:', roles)
      }
    } catch (getErr: any) {
      console.warn('[API /user/roles] frappe.client.get failed:', getErr.message)
    }

    // Step 3: If roles are empty but role_profile_name is set, derive roles
    if (roles.length === 0 && roleProfileName) {
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
      }
      roles = PROFILE_ROLES[roleProfileName] || []
      console.log('[API /user/roles] Derived roles from profile:', roleProfileName, '->', roles)
    }

    // Step 4: If STILL empty, use provisioning service (ignore_permissions)
    if (roles.length === 0) {
      try {
        const context = await getTenantContext()
        if (context.subdomain) {
          const { getUserRoles } = await import('@/lib/provisioning-client')
          const provRoleData = await getUserRoles(context.subdomain, userEmail)
          roles = provRoleData.roles || []
          roleProfileName = provRoleData.role_profile_name || null
          console.log('[API /user/roles] Provisioning fallback roles:', roles, 'profile:', roleProfileName)

          // If provisioning returned a profile name but no roles, derive
          if (roles.length === 0 && roleProfileName) {
            const PROFILE_ROLES: Record<string, string[]> = {
              'Administrator': ['System Manager'],
              'Sales Manager': ['Sales Manager', 'Sales User'],
              'Sales User': ['Sales User'],
              'Standard User': ['Employee', 'Sales User'],
            }
            roles = PROFILE_ROLES[roleProfileName] || []
          }
        }
      } catch (provErr: any) {
        console.warn('[API /user/roles] Provisioning fallback failed:', provErr.message)
      }
    }

    // Step 5: Last resort — user has zero roles somehow (corrupted state).
    // Give them the minimum Sales User access so the app is usable.
    // Login normalization will assign proper roles on next login.
    if (roles.length === 0) {
      console.warn('[API /user/roles] No roles found for', userEmail, '— assigning minimum Sales User fallback')
      roles = ['Sales User']
    }

    console.log('[API /user/roles] Final roles:', roles)

    return NextResponse.json({
      success: true,
      roles,
      roleProfileName,
      user: {
        name: userEmail,
        email: userEmail,
      },
    })
  } catch (error: any) {
    console.error('[API /user/roles] Failed to fetch roles:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch user roles',
        roles: [],
      },
      { status: 500 }
    )
  }
}
