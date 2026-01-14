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
 * Call the ERPNext internal provisioning API to create a new tenant site
 */
async function provisionTenantSite(
  tenantName: string,
  adminPassword: string,
  companyName: string
): Promise<SignupResult> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('Server configuration error: API credentials not found')
  }

  const endpoint = `${BASE_URL}/api/method/nexus_core.nexus_core.api.create_tenant_site`
  const authHeader = `token ${API_KEY}:${API_SECRET}`

  try {
    console.log('Provisioning tenant site:', { tenantName, companyName })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        tenant_name: tenantName,
        admin_password: adminPassword,
        company_name: companyName,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Provisioning API error:', {
        status: response.status,
        data,
      })

      // Extract error message from Frappe response
      let errorMessage = 'Failed to provision tenant site'
      if (data.exception || data.exc_type) {
        errorMessage = data.exception || data.exc_type
      } else if (data.message) {
        errorMessage = typeof data.message === 'string' 
          ? data.message 
          : JSON.stringify(data.message)
      } else if (data._server_messages) {
        try {
          const messages = JSON.parse(data._server_messages)
          const firstMessage = JSON.parse(messages[0])
          errorMessage = firstMessage.message || errorMessage
        } catch (e) {
          // Ignore parsing errors
        }
      }

      return {
        success: false,
        error: errorMessage,
      }
    }

    // Extract response from Frappe's message wrapper
    const result = data.message || data

    if (result.success === false) {
      return {
        success: false,
        error: result.error || 'Provisioning failed',
      }
    }

    console.log('✅ Tenant provisioned successfully:', result)

    return {
      success: true,
      site_url: result.site_url || result.site,
      tenant_name: result.site || tenantName,
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

    // 3. Call provisioning API
    const result = await provisionTenantSite(tenantName, password, companyName)

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
