'use server'

import { auth } from '@/auth'
import { frappeRequest } from '@/app/lib/api'
import { canInviteUser, incrementUsage } from './usage-limits'
import { headers, cookies } from 'next/headers'
import { sendInviteEmail } from '@/lib/email'

/**
 * NEW-2 Fix: Require a valid NextAuth session before any mutation.
 */
async function assertAuthenticated(): Promise<string> {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Unauthorized: authentication required')
  }
  return session.user.email
}

/**
 * Invite a team member to the current tenant
 * Creates a new user in the tenant's ERPNext site
 */
export async function inviteTeamMember(data: {
  email: string
  fullName: string
  role: string
}): Promise<{ success: boolean; error?: string; limitReached?: boolean; currentUsage?: number; limit?: number | 'unlimited'; tempPassword?: string }> {
  try {
    // Check usage limits first
    const headersList = await headers()
    const subdomain = headersList.get('x-tenant-id') || headersList.get('X-Subdomain')

    // Resolve inviter name + org name for the email (best-effort)
    let inviterName = 'Your team admin'
    let organizationName = 'your organization'
    let loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avariq.in'
    try {
      const cookieStore = await cookies()
      const inviterEmail = cookieStore.get('user_email')?.value
      if (inviterEmail) {
        const inviterData = await frappeRequest('frappe.client.get_value', 'GET', {
          doctype: 'User', filters: inviterEmail, fieldname: 'full_name'
        }) as { full_name?: string }
        if (inviterData?.full_name) inviterName = inviterData.full_name
      }
      const companies = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Company', fields: '["company_name"]', limit_page_length: 1
      }) as { company_name: string }[]
      if (companies?.[0]?.company_name) organizationName = companies[0].company_name
      if (subdomain) {
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
        loginUrl = process.env.NODE_ENV === 'production'
          ? `https://${subdomain}.${rootDomain}/login`
          : `http://${subdomain}.localhost:3000/login`
      }
    } catch {
      // Non-fatal — fall back to defaults above
    }
    if (subdomain) {
      const usageCheck = await canInviteUser(subdomain)
      if (!usageCheck.allowed) {
        return { 
          success: false,
          error: usageCheck.message || 'User limit reached',
          limitReached: true,
          currentUsage: usageCheck.current,
          limit: usageCheck.limit
        }
      }
    }
    
    // Check if user already exists (including disabled/removed users)
    const existingUsers = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'User',
      // NEW-3 Fix: Use structured filter array instead of string interpolation
      filters: JSON.stringify([['email', '=', data.email]]),
      fields: '["name", "email", "enabled"]',
      limit_page_length: 1
    }) as any[]
    
    if (existingUsers && existingUsers.length > 0) {
      const existing = existingUsers[0]
      if (existing.enabled) {
        return {
          success: false,
          error: 'A user with this email already exists in your organization'
        }
      }
      // Previously removed (disabled) — re-enable and update their role
      // Generate a fresh temp password so the admin can share access again
      const resetPassword = generateTempPassword()
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'User', name: existing.email, fieldname: 'enabled', value: 1
      })
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'User', name: existing.email, fieldname: 'new_password', value: resetPassword
      })
      // Re-assign proper roles via provisioning service (ignore_permissions)
      try {
        const { assignUserRoles } = await import('@/lib/provisioning-client')
        const roleNames = (ROLE_SETS[data.role] || ROLE_SETS.member)
        await assignUserRoles(subdomain!, existing.email, roleNames)
      } catch (roleErr: any) {
        console.warn('[inviteTeamMember] Role assignment via provisioning failed (non-fatal):', roleErr.message)
      }
      if (subdomain) await incrementUsage(subdomain, 'usage_users')

      // Send invite email (non-fatal)
      try {
        await sendInviteEmail({
          inviteeName: data.fullName,
          inviteeEmail: data.email,
          organizationName,
          inviterName,
          role: data.role,
          loginUrl,
          tempPassword: resetPassword,
        })
      } catch (emailErr: any) {
        console.warn('[inviteTeamMember] Email delivery failed (non-fatal):', emailErr.message)
      }

      return { success: true, tempPassword: resetPassword }
    }
    
    // Create user in ERPNext.
    // We generate a temp password and return it to the admin to share manually.
    // Frappe's send_welcome_email is disabled because its email link points to the
    // raw Frappe backend URL (127.0.0.1:8000), not our Next.js app.
    const tempPassword = generateTempPassword()
    const userData = {
      doctype: 'User',
      email: data.email,
      first_name: data.fullName,
      enabled: 1,
      send_welcome_email: 0,
      new_password: tempPassword,
      roles: getRolesForType(data.role),
    }
    
    await frappeRequest('frappe.client.insert', 'POST', {
      doc: userData
    })
    
    // NEW FIX: Frappe's user insert ignores child table (Has Role) assignments if not extremely specific,
    // or if the user calling the API lacks the System Manager role to assign roles.
    // We enforce the roles immediately via the provisioning service (ignore_permissions=True).
    try {
      const { assignUserRoles } = await import('@/lib/provisioning-client')
      const roleNames = (ROLE_SETS[data.role] || ROLE_SETS.member)
      if (subdomain) {
        await assignUserRoles(subdomain, data.email, roleNames)
      }
    } catch (roleErr: any) {
      console.warn('[inviteTeamMember] Role assignment for NEW user failed (non-fatal):', roleErr.message)
    }
    
    // Increment usage counter
    if (subdomain) {
      await incrementUsage(subdomain, 'usage_users')
    }

    // Send invite email (non-fatal — temp password is also shown in the UI)
    try {
      await sendInviteEmail({
        inviteeName: data.fullName,
        inviteeEmail: data.email,
        organizationName,
        inviterName,
        role: data.role,
        loginUrl,
        tempPassword,
      })
    } catch (emailErr: any) {
      console.warn('[inviteTeamMember] Email delivery failed (non-fatal):', emailErr.message)
    }

    return { success: true, tempPassword }
  } catch (error: any) {
    console.error('Invite team member error:', error)
    return {
      success: false,
      error: error.message || 'Failed to invite team member'
    }
  }
}

/**
 * Get list of team members for current tenant
 */
export async function getTeamMembers(): Promise<any[]> {
  try {
    const users = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'User',
      filters: `[["enabled", "=", 1], ["name", "!=", "Administrator"], ["name", "!=", "Guest"]]`,
      fields: '["name", "email", "first_name", "last_name", "enabled", "creation", "last_login", "user_type", "role_profile_name"]',
      limit_page_length: 100
    }) as any[]
    
    if (!users || users.length === 0) return []

    // Map role_profile_name → roles and primary role (avoids querying Has Role child table
    // which triggers check_parent_permission and causes 403 errors in Frappe v15)
    const PROFILE_ROLES: Record<string, string[]> = {
      'Administrator': ['System Manager'],
      'System Manager': ['System Manager'],
      'Sales Manager': ['Sales Manager', 'Sales User'],
      'Sales User': ['Sales User'],
      'Accounts Manager': ['Accounts Manager', 'Accounts User'],
      'Accounts User': ['Accounts User'],
      'Projects Manager': ['Projects Manager', 'Projects User'],
      'Projects User': ['Projects User'],
      'Stock Manager': ['Stock Manager', 'Stock User'],
      'Stock User': ['Stock User'],
      'Standard User': ['Employee', 'Sales User'],
    }

    const PROFILE_PRIMARY: Record<string, string> = {
      'Administrator': 'System Manager',
      'System Manager': 'System Manager',
      'Sales Manager': 'Sales Manager',
      'Sales User': 'Sales User',
      'Accounts Manager': 'Accounts Manager',
      'Accounts User': 'Accounts User',
      'Projects Manager': 'Projects Manager',
      'Projects User': 'Projects User',
      'Stock Manager': 'Stock Manager',
      'Stock User': 'Stock User',
      'Standard User': 'Employee',
    }

    const { getAccessibleModules } = await import('@/lib/role-permissions')

    return users.map((u: any) => {
      const actualRoles = PROFILE_ROLES[u.role_profile_name] || []
      const primaryRole = PROFILE_PRIMARY[u.role_profile_name] || null
      const accessibleModules = getAccessibleModules(actualRoles)
      // A user is "broken" if they have no role profile set (no access will be granted)
      const hasBrokenRoles = !u.role_profile_name

      return {
        ...u,
        primary_role: primaryRole,
        actual_roles: actualRoles,
        modules_count: accessibleModules.length,
        has_broken_roles: hasBrokenRoles,
      }
    })
  } catch (error) {
    console.error('Failed to fetch team members:', error)
    return []
  }
}

/**
 * Remove a team member (disable user)
 * NEW-2 Fix: Requires authentication.
 * NEW-4 (IDOR) Fix: Verifies the target email exists in the current tenant
 * before disabling, preventing cross-tenant user disabling by guessing emails.
 */
export async function removeTeamMember(email: string): Promise<{ success: boolean; error?: string }> {
  // NEW-2: Require authentication
  try {
    await assertAuthenticated()
  } catch {
    return { success: false, error: 'Unauthorized: authentication required' }
  }

  try {
    // Don't allow removing Administrator
    if (email === 'Administrator' || email === 'administrator@example.com') {
      return {
        success: false,
        error: 'Cannot remove administrator user'
      }
    }

    // NEW-4 (IDOR) Fix: Verify the target user actually exists in this tenant
    // before disabling them. Without this check, a low-privilege user could
    // disable any user in any tenant by guessing their email.
    const targetUsers = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'User',
      filters: JSON.stringify([['email', '=', email], ['enabled', '=', 1]]),
      fields: '["name", "email"]',
      limit_page_length: 1,
    }) as any[]

    if (!targetUsers || targetUsers.length === 0) {
      return { success: false, error: 'User not found in this tenant' }
    }

    // Disable the user instead of deleting (best practice)
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'User',
      name: email,
      fieldname: 'enabled',
      value: 0
    })

    // Decrement usage counter
    const headersList = await headers()
    const subdomain = headersList.get('X-Subdomain')

    if (subdomain) {
      await incrementUsage(subdomain, 'usage_users', -1)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Remove team member error:', error)
    return {
      success: false,
      error: error.message || 'Failed to remove team member'
    }
  }
}

/**
 * Update team member role
 * NEW-2 Fix: Requires authentication before role changes.
 */
export async function updateTeamMemberRole(
  email: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  // NEW-2: Require authentication
  try {
    await assertAuthenticated()
  } catch {
    return { success: false, error: 'Unauthorized: authentication required' }
  }

  try {
    const headersList = await headers()
    const subdomain = headersList.get('x-tenant-id') || headersList.get('X-Subdomain')
    if (!subdomain) {
      return { success: false, error: 'Could not determine tenant' }
    }

    // Use provisioning service to assign roles with ignore_permissions
    const { assignUserRoles } = await import('@/lib/provisioning-client')
    const roleNames = (ROLE_SETS[role] || ROLE_SETS.member)
    await assignUserRoles(subdomain, email, roleNames)

    return { success: true }
  } catch (error: any) {
    console.error('Update role error:', error)
    return {
      success: false,
      error: error.message || 'Failed to update role'
    }
  }
}

// Helpers

function generateTempPassword(): string {
  // 12-char readable password (no ambiguous chars like 0/O/1/l)
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = upper + lower + digits
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)]
  // Guarantee at least one of each group, pad to 12
  const base = rand(upper) + rand(upper) + rand(lower) + rand(lower) + rand(digits) + rand(digits)
  const rest = Array.from({ length: 6 }, () => rand(all)).join('')
  // Shuffle
  return (base + rest).split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Maps each invitation role type to the full set of Frappe roles
 * the user needs on the tenant site.
 *
 * NOTE: We intentionally do NOT use role_profile_name because Frappe
 * silently overrides explicit roles when a profile is set.
 */
import { ROLE_SETS, getRolesForType, getPrimaryRoleForType } from '@/lib/role-sets'


