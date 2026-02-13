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

    // Now fetch full user details with roles using the actual email
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
    const roles = Array.isArray(user.roles)
      ? user.roles.map((r: any) => r.role || r.name)
      : []

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
