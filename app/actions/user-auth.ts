'use server'

import { cookies } from 'next/headers'
import { frappeRequest } from '@/app/lib/api'

export async function loginUser(email: string, password: string) {
  try {
    const erpUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL
    
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

    if (data.message === 'Logged In' || response.ok) {
      const cookieStore = await cookies()
      const setCookieHeader = response.headers.get('set-cookie')
      
      if (setCookieHeader) {
        cookieStore.set('sid', setCookieHeader.split(';')[0].split('=')[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7
        })
      }

      return { success: true, user: data.full_name || email }
    }

    return { success: false, error: 'Invalid credentials' }
  } catch (error: any) {
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
    const [firstName, ...lastNameParts] = data.fullName.split(' ')
    const erpUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL
    
    // Use the signup API endpoint which creates users properly
    const signupResponse = await fetch(`${erpUrl}/api/method/frappe.core.doctype.user.user.sign_up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        full_name: data.fullName,
        redirect_to: '/onboarding'
      })
    })

    if (!signupResponse.ok) {
      const errorData = await signupResponse.json()
      return { success: false, error: errorData.message || 'Failed to create user' }
    }

    // Set the password using the API
    const erpApiKey = process.env.ERPNEXT_API_KEY
    const erpApiSecret = process.env.ERPNEXT_API_SECRET

    if (erpApiKey && erpApiSecret) {
      await fetch(`${erpUrl}/api/method/frappe.client.set_value`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${erpApiKey}:${erpApiSecret}`
        },
        body: JSON.stringify({
          doctype: 'User',
          name: data.email,
          fieldname: 'new_password',
          value: data.password
        })
      })
    }

    // Now login with the new user credentials (not API credentials)
    const loginResult = await loginUser(data.email, data.password)
    if (!loginResult.success) {
      return { success: false, error: 'User created but login failed. Please try logging in manually.' }
    }

    return { 
      success: true, 
      user: { email: data.email, fullName: data.fullName },
      needsOnboarding: true,
      organizationName: data.organizationName
    }
  } catch (error: any) {
    console.error('Signup error:', error)
    return { success: false, error: error.message || 'Failed to create account' }
  }
}

export async function logoutUser() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('sid')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCurrentUser() {
  try {
    const result = await frappeRequest('frappe.auth.get_logged_user', 'GET', {})
    return result
  } catch (error) {
    return null
  }
}

export async function getCurrentUserOrganization() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const orgs = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Organization Member',
      filters: JSON.stringify({ email: user }),
      fields: JSON.stringify(['organization_slug', 'role']),
      limit_page_length: 1
    })

    if (!orgs || orgs.length === 0) return null

    const org = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Organization',
      filters: JSON.stringify({ slug: orgs[0].organization_slug })
    })

    return { ...org, userRole: orgs[0].role }
  } catch (error) {
    return null
  }
}
