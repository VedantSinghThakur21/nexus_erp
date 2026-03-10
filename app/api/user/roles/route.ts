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

    // Fetch full user details with roles using the tenant user's own credentials.
    // Users can read their own User doc in Frappe — no master credentials needed.
    // Master credentials only work on the master site, not on tenant sites.
    const response = await frappeRequest(
      'frappe.client.get',
      'POST',
      {
        doctype: 'User',
        name: userEmail,
        fields: JSON.stringify(['name', 'email', 'full_name', 'roles']),
      }
    ) as any

    const user = response.message || response

    // Extract role names from the roles array
    let roles = Array.isArray(user.roles)
      ? user.roles.map((r: any) => r.role || r.name).filter((r: string) => r && r !== 'All')
      : []

    // If user has role_profile_name but roles array is empty/minimal,
    // derive roles from the profile name as a fallback.
    // This handles users whose roles are managed by an outdated role profile.
    if (roles.length === 0 && user.role_profile_name) {
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
      roles = PROFILE_ROLES[user.role_profile_name] || roles
    }

    return NextResponse.json({
      success: true,
      roles,
      user: {
        name: user.name,
        email: user.email,
        fullName: user.full_name,
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
