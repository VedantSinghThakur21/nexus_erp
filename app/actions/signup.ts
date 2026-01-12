'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { frappeRequest } from '../lib/api'

interface SignupData {
  email: string
  password: string
  fullName: string
  organizationName: string
}

interface SignupResult {
  success: boolean
  error?: string
  data?: {
    userId: string
    organizationId: string
  }
}

/**
 * Simple signup: Creates a user and organization in the default ERPNext site
 * No site provisioning - just user creation in the existing ERPNext instance
 */
export async function signup(data: SignupData): Promise<SignupResult> {
  try {
    console.log('Starting signup for:', data.email)
    
    // Split full name
    const nameParts = data.fullName.trim().split(' ')
    const firstName = nameParts[0] || 'User'
    const lastName = nameParts.slice(1).join(' ') || ''
    
    // 1. Create User in ERPNext
    console.log('Creating user...')
    try {
      const user = await frappeRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'User',
          email: data.email,
          first_name: firstName,
          last_name: lastName,
          enabled: 1,
          send_welcome_email: 0,
          user_type: 'System User'
        }
      })
      
      console.log('✅ User created:', user.name)
      
      // 2. Set user password
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'User',
        name: data.email,
        fieldname: 'new_password',
        value: data.password
      })
      
      console.log('✅ Password set')
      
      // 3. Create Organization (if applicable)
      let organizationId = null
      if (data.organizationName) {
        console.log('Creating organization...')
        try {
          const org = await frappeRequest('frappe.client.insert', 'POST', {
            doc: {
              doctype: 'Company',
              company_name: data.organizationName,
              abbr: data.organizationName.substring(0, 5).toUpperCase(),
              default_currency: 'USD',
              country: 'United States'
            }
          })
          
          organizationId = org.name
          console.log('✅ Organization created:', organizationId)
          
          // Link user to company
          await frappeRequest('frappe.client.set_value', 'POST', {
            doctype: 'User',
            name: data.email,
            fieldname: 'company',
            value: organizationId
          })
        } catch (orgError: any) {
          console.warn('Organization creation failed (non-critical):', orgError.message)
        }
      }
      
      // 4. Login the user (get session cookie)
      console.log('Logging in user...')
      const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
      const SITE_NAME = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
      
      const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-Site-Name': SITE_NAME,
        },
        body: JSON.stringify({
          usr: data.email,
          pwd: data.password
        })
      })
      
      if (!loginRes.ok) {
        throw new Error('Login failed after user creation')
      }
      
      // Extract session cookie
      const setCookieHeader = loginRes.headers.get('set-cookie')
      if (setCookieHeader) {
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        if (sidMatch) {
          const sid = sidMatch[1]
          
          // Set session cookie for Next.js
          const cookieStore = await cookies()
          cookieStore.set('sid', sid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
          })
          
          console.log('✅ User logged in')
        }
      }
      
      return {
        success: true,
        data: {
          userId: data.email,
          organizationId: organizationId || ''
        }
      }
      
    } catch (userError: any) {
      // Handle user already exists
      if (userError.message?.includes('already exists')) {
        throw new Error('A user with this email already exists')
      }
      throw userError
    }
    
  } catch (error: any) {
    console.error('Signup failed:', error)
    return {
      success: false,
      error: error.message || 'Signup failed'
    }
  }
}

/**
 * After successful signup, redirect to dashboard
 */
export async function signupAndRedirect(formData: FormData) {
  const data: SignupData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    fullName: formData.get('fullName') as string,
    organizationName: formData.get('organizationName') as string,
  }
  
  const result = await signup(data)
  
  if (result.success) {
    redirect('/dashboard')
  } else {
    throw new Error(result.error || 'Signup failed')
  }
}

// Export signup as default for backward compatibility
export { signup as signupWithTenant }
