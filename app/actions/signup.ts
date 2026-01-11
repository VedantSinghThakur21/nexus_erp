'use server'

import { frappeRequest } from '../lib/api'

interface SignupData {
  email: string
  password: string
  fullName: string
  organizationName: string
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate password strength
 * Requirements: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
 */
function isValidPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

/**
 * Sanitize name inputs to prevent XSS
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[<>"'&]/g, '') // Remove HTML/script characters
    .trim()
    .substring(0, 140) // Max length
}

interface SignupResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Simple Single-Tenant Signup
 * Creates a user in the default ERPNext site
 */
export async function signup(data: SignupData): Promise<SignupResult> {
  try {
    // Validate inputs
    if (!isValidEmail(data.email)) {
      return {
        success: false,
        error: 'Invalid email format'
      }
    }

    if (!isValidPassword(data.password)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      }
    }

    const sanitizedFullName = sanitizeName(data.fullName)
    const sanitizedOrgName = sanitizeName(data.organizationName)

    if (!sanitizedFullName || sanitizedFullName.length < 2) {
      return {
        success: false,
        error: 'Invalid full name'
      }
    }

    if (!sanitizedOrgName || sanitizedOrgName.length < 2) {
      return {
        success: false,
        error: 'Invalid organization name'
      }
    }

    // Check if user already exists
    try {
      const existingUsers = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'User',
        filters: JSON.stringify({ email: data.email }),
        fields: JSON.stringify(['name'])
      })

      if (existingUsers && existingUsers.length > 0) {
        return {
          success: false,
          error: 'An account with this email already exists'
        }
      }
    } catch (error: any) {
      console.error('Error checking existing user:', error)
      // Continue with signup if check fails (don't block)
    }

    // Create new user in ERPNext
    const newUser = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'User',
        email: data.email,
        first_name: sanitizedFullName.split(' ')[0],
        last_name: sanitizedFullName.split(' ').slice(1).join(' ') || '',
        full_name: sanitizedFullName,
        send_welcome_email: 0,
        new_password: data.password,
        enabled: 1,
        user_type: 'System User'
      }
    })

    console.log('✅ User created successfully:', data.email)

    // Create Organization (Customer DocType in ERPNext)
    try {
      await frappeRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Customer',
          customer_name: sanitizedOrgName,
          customer_type: 'Company',
          territory: 'All Territories',
          customer_group: 'All Customer Groups'
        }
      })
      console.log('✅ Organization created:', sanitizedOrgName)
    } catch (error) {
      console.warn('⚠️ Could not create organization:', error)
      // Don't fail signup if organization creation fails
    }

    return {
      success: true,
      message: 'Account created successfully! You can now log in.'
    }

  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle specific ERPNext errors
    if (error.message?.includes('already exists')) {
      return {
        success: false,
        error: 'An account with this email already exists'
      }
    }

    if (error.message?.includes('permission')) {
      return {
        success: false,
        error: 'Signup is currently disabled. Please contact support.'
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to create account. Please try again.'
    }
  }
}
