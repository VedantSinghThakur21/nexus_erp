'use server'

import { frappeRequest } from '@/app/lib/api'
import { canInviteUser, incrementUsage } from './usage-limits'
import { headers } from 'next/headers'

/**
 * Invite a team member to the current tenant
 * Creates a new user in the tenant's ERPNext site
 */
export async function inviteTeamMember(data: {
  email: string
  fullName: string
  role: string
}): Promise<{ success: boolean; error?: string; limitReached?: boolean; currentUsage?: number; limit?: number | 'unlimited' }> {
  try {
    // Check usage limits first
    const headersList = await headers()
    const subdomain = headersList.get('X-Subdomain')
    
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
      filters: `[["email", "=", "${data.email}"]]`,
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
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'User', name: existing.email, fieldname: 'enabled', value: 1
      })
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'User', name: existing.email, fieldname: 'role_profile_name', value: getRoleProfile(data.role)
      })
      if (subdomain) await incrementUsage(subdomain, 'usage_users')
      return { success: true }
    }
    
    // Create user in ERPNext — no new_password so Frappe sends the welcome email
    // with a password-setup link to the invited user's inbox
    const userData = {
      doctype: 'User',
      email: data.email,
      first_name: data.fullName,
      enabled: 1,
      send_welcome_email: 1,
      role_profile_name: getRoleProfile(data.role),
      roles: [
        { role: 'System Manager' }, // Base role
        { role: getRoleForType(data.role) }
      ]
    }
    
    await frappeRequest('frappe.client.insert', 'POST', {
      doc: userData
    })
    
    // Increment usage counter
    if (subdomain) {
      await incrementUsage(subdomain, 'usage_users')
    }
    
    // TODO: Send invitation email with login instructions
    // This would be handled by ERPNext's send_welcome_email feature
    
    return { success: true }
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
    
    return users || []
  } catch (error) {
    console.error('Failed to fetch team members:', error)
    return []
  }
}

/**
 * Remove a team member (disable user)
 */
export async function removeTeamMember(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Don't allow removing Administrator
    if (email === 'Administrator' || email === 'administrator@example.com') {
      return {
        success: false,
        error: 'Cannot remove administrator user'
      }
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
 */
export async function updateTeamMemberRole(
  email: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'User',
      name: email,
      fieldname: 'role_profile_name',
      value: getRoleProfile(role)
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('Update role error:', error)
    return {
      success: false,
      error: error.message || 'Failed to update role'
    }
  }
}

// Helper functions
function getRoleProfile(roleType: string): string {
  const profiles: Record<string, string> = {
    'admin': 'Administrator',
    'member': 'Standard User',
    'sales': 'Sales User',
    'projects': 'Projects User',
    'accounts': 'Accounts User'
  }
  
  return profiles[roleType] || 'Standard User'
}

function getRoleForType(roleType: string): string {
  const roles: Record<string, string> = {
    'admin': 'System Manager',
    'member': 'Employee',
    'sales': 'Sales Manager',
    'projects': 'Projects Manager',
    'accounts': 'Accounts Manager'
  }
  
  return roles[roleType] || 'Employee'
}
