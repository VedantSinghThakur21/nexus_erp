/**
 * API Route: /api/user/roles
 * 
 * Fetches current user's roles from Frappe ERPNext backend
 */

import { NextRequest, NextResponse } from 'next/server'
import { frappeRequest } from '@/app/lib/api'

export async function GET(request: NextRequest) {
  try {
    // Fetch current logged-in user info using Frappe's auth method
    const userInfoResponse = await frappeRequest(
      'frappe.auth.get_logged_user',
      'GET'
    ) as any

    const userEmail = userInfoResponse.message || userInfoResponse

    if (!userEmail) {
      throw new Error('No user logged in')
    }

    console.log('[API /user/roles] Fetching roles for:', userEmail)

    // Attempt 1: Fetch full user doc with roles
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

    // Attempt 2: If roles are empty, try role_profile_name mapping
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
        'Standard User': ['Employee'],
      }
      roles = PROFILE_ROLES[roleProfileName] || []
      console.log('[API /user/roles] Derived roles from profile:', roleProfileName, '->', roles)
    }

    // Attempt 3: If still empty, try fetching role_profile_name separately
    if (roles.length === 0) {
      try {
        const profileData = await frappeRequest('frappe.client.get_value', 'GET', {
          doctype: 'User',
          filters: JSON.stringify({ name: userEmail }),
          fieldname: 'role_profile_name'
        }) as any

        const profileName = profileData?.role_profile_name
        if (profileName) {
          roleProfileName = profileName
          const PROFILE_ROLES: Record<string, string[]> = {
            'Administrator': ['System Manager'],
            'System Manager': ['System Manager'],
            'Sales Manager': ['Sales Manager', 'Sales User'],
            'Sales User': ['Sales User'],
            'Accounts Manager': ['Accounts Manager', 'Accounts User'],
            'Accounts User': ['Accounts User'],
            'Projects Manager': ['Projects Manager', 'Projects User'],
            'Projects User': ['Projects User'],
            'Standard User': ['Employee'],
          }
          roles = PROFILE_ROLES[profileName] || []
          console.log('[API /user/roles] Fallback profile fetch:', profileName, '->', roles)
        }
      } catch (fallbackErr: any) {
        console.warn('[API /user/roles] Fallback get_value failed:', fallbackErr.message)
      }
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
