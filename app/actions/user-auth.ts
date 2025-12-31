'use server'

import { cookies } from 'next/headers'
import { frappeRequest, userRequest } from '@/app/lib/api'

export async function loginUser(email: string, password: string) {
  try {
    const erpUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL
    
    console.log('Attempting login for:', email)
    
    const response = await fetch(`${erpUrl}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        usr: email,
        pwd: password
      })
    })

    const data = await response.json()
    console.log('Login response:', data)

    if (data.message === 'Logged In' || data.message === 'No App' || response.ok) {
      const cookieStore = await cookies()
      const setCookieHeader = response.headers.get('set-cookie')
      
      if (setCookieHeader) {
        // Extract sid cookie value
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        if (sidMatch) {
          cookieStore.set('sid', sidMatch[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          })
          console.log('Session cookie set for user:', email)
        }
      }

      return { success: true, user: data.full_name || email }
    }

    return { success: false, error: data.message || 'Invalid credentials' }
  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message }
    return { success: false, error: error.message }
  }
}

export async function signupUser(data: {
  email: string
  password: string
  fullName: string
  organizationName: string
}) {
  try {
    console.log('Starting signup process for:', data.email)
    
    // Validate password strength (ERPNext requirements)
    const passwordErrors = []
    if (data.password.length < 8) {
      passwordErrors.push('at least 8 characters')
    }
    if (!/[A-Z]/.test(data.password)) {
      passwordErrors.push('at least one uppercase letter')
    }
    if (!/[a-z]/.test(data.password)) {
      passwordErrors.push('at least one lowercase letter')
    }
    if (!/[0-9]/.test(data.password)) {
      passwordErrors.push('at least one number')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
      passwordErrors.push('at least one special character')
    }
    
    if (passwordErrors.length > 0) {
      return {
        success: false,
        error: `Password must contain ${passwordErrors.join(', ')}`
      }
    }
    
    // First check if user already exists
    try {
      const existingUsers = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'User',
        filters: JSON.stringify({ email: data.email }),
        fields: JSON.stringify(['name', 'email']),
        limit_page_length: 1
      })
      
      if (existingUsers && existingUsers.length > 0) {
        console.log('User already exists:', data.email)
        return { 
          success: false, 
          error: 'An account with this email already exists. Please log in instead.' 
        }
      }
    } catch (checkError) {
      console.log('Could not check existing user (may not exist yet):', checkError)
    }
    
    const [firstName, ...lastNameParts] = data.fullName.split(' ')
    
    // Create user with minimal required fields
    const userDoc = {
      doctype: 'User',
      email: data.email,
      first_name: firstName,
      last_name: lastNameParts.join(' ') || firstName,
      enabled: 1,
      send_welcome_email: 0,
      new_password: data.password
    }

    console.log('Creating user with data:', { email: userDoc.email, firstName: userDoc.first_name })

    try {
      const userResult = await frappeRequest('frappe.client.insert', 'POST', {
        doc: userDoc
      })

      if (!userResult) {
        return { success: false, error: 'Failed to create user account. Please try again.' }
      }

      console.log('User created successfully:', userResult)

      // Give ERPNext a moment to process the user creation
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Now login with the new user credentials
      console.log('Attempting to login new user...')
      const loginResult = await loginUser(data.email, data.password)
      
      if (!loginResult.success) {
        console.warn('Auto-login failed after user creation')
        return { 
          success: false, 
          error: 'Account created successfully! Please log in with your credentials.',
          userCreated: true
        }
      }

      console.log('User logged in successfully')
      return { 
        success: true, 
        user: { email: data.email, fullName: data.fullName },
        needsOnboarding: true,
        organizationName: data.organizationName
      }
    } catch (createError: any) {
      console.error('User creation error:', createError)
      
      const errorMsg = createError.message || ''
      
      // Check for password validation errors
      if (errorMsg.includes('Invalid Password') || errorMsg.includes('password')) {
        return {
          success: false,
          error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (!@#$%^&*)'
        }
      }
      
      // Check for common error patterns
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        return { 
          success: false, 
          error: 'An account with this email already exists. Please log in instead.' 
        }
      }
      
      if (errorMsg.includes('password')) {
        return {
          success: false,
          error: 'Password does not meet requirements. Please use a stronger password.'
        }
      }
      
      if (errorMsg.includes('email') || errorMsg.includes('valid')) {
        return {
          success: false,
          error: 'Please enter a valid email address.'
        }
      }
      
      // Generic error with helpful message
      return { 
        success: false, 
        error: `Failed to create account: ${errorMsg.substring(0, 100)}. Please contact support if the issue persists.` 
      }
    }
  } catch (error: any) {
    console.error('Signup error:', error)
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please check your connection and try again.' 
    }
  }
}

export async function logoutUser() {
  try {
    const erpUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL
    
    // Call ERPNext logout endpoint
    try {
      await fetch(`${erpUrl}/api/method/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    } catch (error) {
      console.error('ERPNext logout error:', error)
    }
    
    // Delete local session cookie
    const cookieStore = await cookies()
    cookieStore.delete('sid')
    
    return { success: true }
  } catch (error: any) {
    console.error('Logout error:', error)
    return { success: false, error: error.message }
  }
}

export async function getCurrentUser() {
  try {
    // Use userRequest instead of frappeRequest to get the actual logged-in user
    const result = await userRequest('frappe.auth.get_logged_user', 'GET', {})
    console.log('Current user from session:', result)
    return result
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export async function getCurrentUserOrganization() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('No user logged in')
      return null
    }

    console.log('Fetching organization for user:', user)

    // Use userRequest for user-specific data
    const orgs = await userRequest('frappe.client.get_list', 'GET', {
      doctype: 'Organization Member',
      filters: JSON.stringify({ email: user }),
      fields: JSON.stringify(['organization_slug', 'role']),
      limit_page_length: 1
    })

    if (!orgs || orgs.length === 0) {
      console.log('No organization found for user')
      return null
    }

    const org = await userRequest('frappe.client.get', 'GET', {
      doctype: 'Organization',
      filters: JSON.stringify({ slug: orgs[0].organization_slug })
    })

    return { ...org, userRole: orgs[0].role }
  } catch (error) {
    return null
  }
}
