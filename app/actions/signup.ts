'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { frappeRequest } from '../lib/api'
import { createTenant } from './tenants'
import { provisionTenant } from './provision'
import { setupTenantDocType } from './setup-tenant'

interface SignupData {
  email: string
  password: string
  fullName: string
  organizationName: string
  subdomain?: string
  plan?: 'free' | 'pro' | 'enterprise'
}

interface SignupResult {
  success: boolean
  error?: string
  tenantId?: string
  siteUrl?: string
  needsProvisioning?: boolean
}

/**
 * Complete signup flow with tenant provisioning
 * 1. Create tenant record in master site
 * 2. Provision ERPNext site (async)
 * 3. Create organization in tenant site
 * 4. Create user in tenant site
 * 5. Auto-login to tenant site
 */
export async function signupWithTenant(data: SignupData): Promise<SignupResult> {
  try {
    // First, ensure Tenant DocType exists (auto-create if missing)
    console.log('Checking Tenant DocType...')
    try {
      const setupResult = await setupTenantDocType()
      if (setupResult.success) {
        console.log('Tenant DocType ready:', setupResult.message)
      }
    } catch (setupError) {
      console.error('Failed to setup Tenant DocType:', setupError)
      // Continue anyway - might already exist
    }

    // Generate subdomain from organization name if not provided
    let subdomain = data.subdomain
    if (!subdomain) {
      subdomain = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 63) // Max 63 chars for subdomain
      
      // Ensure it's at least 3 characters
      if (subdomain.length < 3) {
        subdomain = subdomain + Math.random().toString(36).substring(2, 5)
      }
    }

    // Check if subdomain is available
    const existing = await frappeRequest('frappe.client.get_list', {
      doctype: 'Tenant',
      filters: { subdomain },
      limit_page_length: 1
    })

    if (existing && existing.length > 0) {
      // Subdomain taken, add random suffix
      subdomain = `${subdomain}-${Math.random().toString(36).substring(2, 5)}`
    }

    // Create tenant record
    const tenantResult = await createTenant({
      customer_name: data.fullName,
      company_name: data.organizationName,
      subdomain,
      owner_email: data.email,
      owner_name: data.fullName,
      plan: data.plan || 'free'
    })

    if (!tenantResult.success || !tenantResult.tenant) {
      return {
        success: false,
        error: tenantResult.error || 'Failed to create tenant'
      }
    }

    const tenant = tenantResult.tenant

    // Provision the site (this takes 2-3 minutes)
    console.log('Starting site provisioning for', subdomain)
    const provisionResult = await provisionTenant(
      tenant.id,
      subdomain,
      data.email,
      data.password
    )

    if (!provisionResult.success) {
      return {
        success: false,
        error: provisionResult.error || 'Failed to provision site'
      }
    }

    console.log('Site provisioned successfully:', provisionResult.site_url)

    // Create organization in the NEW tenant site
    // We need to use the tenant's site URL and API credentials
    const siteConfig = typeof tenant.site_config === 'string' 
      ? JSON.parse(tenant.site_config) 
      : tenant.site_config

    // Create organization using tenant's API
    if (siteConfig && siteConfig.api_key && siteConfig.api_secret) {
      try {
        await fetch(`${provisionResult.site_url}/api/method/frappe.client.insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${siteConfig.api_key}:${siteConfig.api_secret}`
          },
          body: JSON.stringify({
            doc: {
              doctype: 'Organization',
              organization_name: data.organizationName,
              organization_slug: subdomain,
              subscription_plan: data.plan || 'free',
              subscription_status: 'trial',
              trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              max_users: data.plan === 'enterprise' ? 999 : (data.plan === 'pro' ? 10 : 2),
              max_leads: data.plan === 'enterprise' ? 999999 : (data.plan === 'pro' ? 1000 : 50),
              max_projects: data.plan === 'enterprise' ? 999999 : (data.plan === 'pro' ? 50 : 5),
              max_invoices: data.plan === 'enterprise' ? 999999 : (data.plan === 'pro' ? 500 : 20)
            }
          })
        })
      } catch (orgError) {
        console.error('Failed to create organization in tenant site:', orgError)
        // Continue anyway - organization can be created later
      }
    }

    // Login to the tenant site
    try {
      const loginResponse = await fetch(`${provisionResult.site_url}/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usr: data.email,
          pwd: data.password
        }),
      })

      if (loginResponse.ok) {
        // Extract session cookie
        const setCookieHeader = loginResponse.headers.get('set-cookie')
        if (setCookieHeader) {
          const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
          if (sidMatch) {
            const cookieStore = await cookies()
            cookieStore.set('sid', sidMatch[1], {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7 // 7 days
            })
            cookieStore.set('user_email', data.email, {
              maxAge: 60 * 60 * 24 * 7
            })
            cookieStore.set('tenant_subdomain', subdomain, {
              maxAge: 60 * 60 * 24 * 7
            })
          }
        }
      }
    } catch (loginError) {
      console.error('Auto-login failed:', loginError)
      // User can login manually
    }

    return {
      success: true,
      tenantId: tenant.id,
      siteUrl: provisionResult.site_url
    }

  } catch (error: any) {
    console.error('Signup with tenant error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create account'
    }
  }
}

/**
 * Invite team member to organization
 * This creates a new user in the tenant site and adds them to the organization
 */
export async function inviteTeamMember(data: {
  email: string
  fullName: string
  role: string
  organizationId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Create user in tenant site
    const userResult = await frappeRequest('frappe.client.insert', {
      doc: {
        doctype: 'User',
        email: data.email,
        first_name: data.fullName,
        send_welcome_email: 1,
        user_type: 'System User'
      }
    }, 'POST', null, true) // useTenantUrl = true

    if (!userResult) {
      throw new Error('Failed to create user')
    }

    // Add to organization
    await frappeRequest('frappe.client.insert', {
      doc: {
        doctype: 'Organization Member',
        organization: data.organizationId,
        user: data.email,
        role: data.role,
        status: 'Active'
      }
    }, 'POST', null, true)

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
 * Legacy signup (without tenant provisioning)
 * Keep for backward compatibility or admin users
 */
export async function signupUser(data: {
  email: string
  password: string
  fullName: string
  organizationName: string
}): Promise<{ success: boolean; error?: string; needsOnboarding?: boolean }> {
  try {
    // Check if user already exists
    const existingUsers = await frappeRequest('frappe.client.get_list', {
      doctype: 'User',
      filters: { email: data.email },
      limit_page_length: 1
    })

    if (existingUsers && existingUsers.length > 0) {
      return {
        success: false,
        error: 'Email already registered. Please login.'
      }
    }

    // Create user with minimal fields
    const userDoc = {
      doctype: 'User',
      email: data.email,
      first_name: data.fullName,
      new_password: data.password,
      user_type: 'System User',
      send_welcome_email: 0
    }

    await frappeRequest('frappe.client.insert', {
      doc: userDoc
    }, 'POST')

    // Wait a moment for user to be fully created
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Auto-login
    const loginResponse = await fetch(`${process.env.ERP_NEXT_URL}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usr: data.email,
        pwd: data.password
      }),
    })

    if (loginResponse.ok) {
      const setCookieHeader = loginResponse.headers.get('set-cookie')
      if (setCookieHeader) {
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        if (sidMatch) {
          const cookieStore = await cookies()
          cookieStore.set('sid', sidMatch[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          })
          cookieStore.set('user_email', data.email, {
            maxAge: 60 * 60 * 24 * 7
          })
        }
      }

      return {
        success: true,
        needsOnboarding: true
      }
    }

    return {
      success: false,
      error: 'Account created but login failed. Please try logging in.'
    }

  } catch (error: any) {
    console.error('Signup error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create account'
    }
  }
}
