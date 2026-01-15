'use server'

import { redirect } from 'next/navigation'

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET

interface SignupResult {
  success: boolean
  site_url?: string
  tenant_name?: string
  error?: string
}

/**
 * Generate a URL-safe subdomain from company name
 * Examples:
 *   "Acme Corp" → "acme-corp"
 *   "ABC Industries!" → "abc-industries"
 *   "123 Tech Co." → "tech-co"
 */
function generateSubdomain(companyName: string): string {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 63) // DNS label max length
}

/**
 * Create tenant record and user in ERPNext without nexus_core app
 * Uses standard Frappe API to create Tenant doctype and User
 */
async function provisionTenantSite(
  tenantName: string,
  adminPassword: string,
  companyName: string,
  email: string
): Promise<SignupResult> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('Server configuration error: API credentials not found')
  }

  const authHeader = `token ${API_KEY}:${API_SECRET}`

  try {
    console.log('Creating tenant record:', { tenantName, companyName })

    // Step 1: Create the User first
    const userEndpoint = `${BASE_URL}/api/resource/User`
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    
    const userResponse = await fetch(userEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        doctype: 'User',
        email: email,
        username: username,
        first_name: companyName.split(' ')[0],
        last_name: companyName.split(' ').slice(1).join(' ') || companyName.split(' ')[0],
        enabled: 1,
        new_password: adminPassword,
        send_welcome_email: 0,
      }),
    })

    if (!userResponse.ok) {
      const userData = await userResponse.json()
      console.error('User creation error:', userData)
      
      // Check if user already exists
      if (userData.exception && userData.exception.includes('DuplicateEntryError')) {
        return {
          success: false,
          error: 'An account with this email already exists. Please login instead.',
        }
      }
      
      return {
        success: false,
        error: userData.exception || userData.message || 'Failed to create user account',
      }
    }

    console.log('✅ User created successfully')

    // Step 2: Create Tenant record
    const tenantEndpoint = `${BASE_URL}/api/resource/Tenant`
    const siteUrl = `${BASE_URL}` // Since we're not creating separate sites, use the main site
    
    const tenantResponse = await fetch(tenantEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        doctype: 'Tenant',
        subdomain: tenantName,
        company_name: companyName,
        owner_email: email,
        site_url: siteUrl,
        status: 'active',
        site_config: JSON.stringify({
          created_at: new Date().toISOString(),
          single_tenant: true,
        }),
      }),
    })

    if (!tenantResponse.ok) {
      const tenantData = await tenantResponse.json()
      console.error('Tenant creation error:', tenantData)
      
      return {
        success: false,
        error: tenantData.exception || tenantData.message || 'Failed to create tenant record',
      }
    }

    console.log('✅ Tenant record created successfully')

    return {
      success: true,
      site_url: siteUrl,
      tenant_name: tenantName,
    }
  } catch (error: any) {
    console.error('Provisioning request failed:', error)
    return {
      success: false,
      error: error.message || 'Network error during provisioning',
    }
  }
}

/**
 * Main signup server action
 * Called from the signup form
 */
export async function signupUser(formData: FormData) {
  try {
    // 1. Extract and validate form data
    const companyName = formData.get('company_name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!companyName || !email || !password) {
      return {
        success: false,
        error: 'Please fill in all required fields',
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      }
    }

    // Password requirements
    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long',
      }
    }

    // 2. Generate URL-safe subdomain
    const tenantName = generateSubdomain(companyName)

    if (!tenantName || tenantName.length < 3) {
      return {
        success: false,
        error: 'Company name must be at least 3 characters and contain letters or numbers',
      }
    }

    console.log('Signup request:', { companyName, email, tenantName })

    // 3. Call provisioning API (pass email now)
    const result = await provisionTenantSite(tenantName, password, companyName, email)

    if (!result.success) {
      return result
    }

    // 4. Success - redirect to login with tenant info
    // Store tenant info in URL params so login page knows where to redirect
    redirect(`/login?tenant=${result.tenant_name}&email=${encodeURIComponent(email)}&new=1`)

  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle redirect throws (not actual errors)
    if (error.message?.includes('NEXT_REDIRECT')) {
      throw error
    }

    return {
      success: false,
      error: error.message || 'An unexpected error occurred during signup',
    }
  }
}
