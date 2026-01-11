'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import { frappeRequest, tenantAuthRequest, tenantAdminRequest } from '../lib/api'
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
 * Sanitize and validate subdomain
 * Only allows alphanumeric and hyphens, prevents common attacks
 */
function sanitizeSubdomain(input: string): string {
  // Remove any characters that aren't alphanumeric or hyphen
  let sanitized = input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-{2,}/g, '-') // Replace multiple hyphens with single
    .substring(0, 63) // DNS max subdomain length
  
  // Prevent reserved/dangerous subdomains
  const reserved = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'root', 'administrator']
  if (reserved.includes(sanitized)) {
    sanitized = `org-${sanitized}`
  }
  
  // Ensure minimum length
  if (sanitized.length < 3) {
    sanitized = sanitized + Math.random().toString(36).substring(2, 5)
  }
  
  return sanitized
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
  tenantId?: string
  siteUrl?: string
  needsProvisioning?: boolean
}

/**
 * Generate a strong random password for admin provisioning.
 * We keep it in-memory only and never persist it to Tenant DocType.
 */
function generateStrongPassword(length: number = 24): string {
  // base64 expands by ~4/3, so we take enough bytes then trim
  return randomBytes(Math.ceil((length * 3) / 4)).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length)
}

/**
 * Helper function to add delay between retries
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Security: Remove admin password from tenant config after setup completes
 * CRITICAL: Call this after user/org creation to minimize credential exposure
 */
async function cleanupTenantCredentials(tenantId: string): Promise<void> {
  try {
    console.log('🔒 [SECURITY] Removing admin password from tenant config:', tenantId)
    
    const tenant = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Tenant',
      name: tenantId
    })
    
    const siteConfig = typeof tenant.site_config === 'string' 
      ? JSON.parse(tenant.site_config)
      : tenant.site_config
    
    // Remove admin password, keep API credentials
    if (siteConfig.admin_password) {
      delete siteConfig.admin_password
      
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Tenant',
        name: tenantId,
        fieldname: 'site_config',
        value: JSON.stringify(siteConfig)
      })
      
      console.log('✅ [SECURITY] Admin password removed from tenant config')
    } else {
      console.log('ℹ️ [SECURITY] No admin password found in config')
    }
  } catch (error) {
    console.error('⚠️ [SECURITY] Failed to cleanup admin credentials:', error)
    // Don't fail signup if cleanup fails - log for manual review
  }
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 3000,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Retry ${attempt}/${maxRetries}] Attempting: ${operationName}`)
      const result = await operation()
      console.log(`✅ Success on attempt ${attempt}`)
      return result
    } catch (error: any) {
      lastError = error
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message)
      
      // Check if it's an auth error that we should retry
      const isAuthError = error.message?.includes('AuthenticationError') || 
                         error.message?.includes('401') ||
                         error.message?.includes('Unauthorized')
      
      if (!isAuthError || attempt === maxRetries) {
        // If it's not an auth error, or we've exhausted retries, throw
        throw error
      }
      
      console.log(`⏳ Waiting ${delayMs}ms before retry ${attempt + 1}/${maxRetries}...`)
      await delay(delayMs)
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
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
    // SECURITY: Validate all inputs before processing
    if (!isValidEmail(data.email)) {
      return {
        success: false,
        error: 'Invalid email address format'
      }
    }
    
    if (!isValidPassword(data.password)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      }
    }
    
    // Sanitize name inputs
    const fullName = sanitizeName(data.fullName)
    const organizationName = sanitizeName(data.organizationName)
    
    if (!fullName || fullName.length < 2) {
      return {
        success: false,
        error: 'Please provide a valid full name'
      }
    }
    
    if (!organizationName || organizationName.length < 2) {
      return {
        success: false,
        error: 'Please provide a valid organization name'
      }
    }
    
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

    // SECURITY: Sanitize subdomain to prevent injection attacks
    let subdomain = data.subdomain
    if (!subdomain) {
      subdomain = sanitizeSubdomain(organizationName)
    } else {
      subdomain = sanitizeSubdomain(subdomain)
    }

    // Check if subdomain is available
    const existing = await frappeRequest('frappe.client.get_list', 'POST', {
      doctype: 'Tenant',
      filters: { subdomain },
      limit_page_length: 1
    })

    if (existing && existing.length > 0) {
      // Subdomain taken, add random suffix
      subdomain = `${subdomain}-${Math.random().toString(36).substring(2, 5)}`
    }

    // Create tenant record with sanitized values
    const tenantResult = await createTenant({
      customer_name: fullName,
      company_name: organizationName,
      subdomain,
      owner_email: data.email,
      owner_name: fullName,
      plan: data.plan || 'free'
    })

    if (!tenantResult.success || !tenantResult.tenant) {
      return {
        success: false,
        error: tenantResult.error || 'Failed to create tenant'
      }
    }

    const tenant = tenantResult.tenant

    // Generate a transient admin password just for provisioning (never stored)
    const adminProvisionPassword = generateStrongPassword(24)

    // Provision the site (this takes 2-3 minutes)
    console.log('Starting site provisioning for', subdomain, '[admin password length only]', adminProvisionPassword.length)
    const provisionResult = await provisionTenant(
      tenant.name || tenant.subdomain,  // Use 'name' field which is the tenant ID
      subdomain,
      data.email,
      adminProvisionPassword
    )

    if (!provisionResult.success) {
      return {
        success: false,
        error: provisionResult.error || 'Failed to provision site'
      }
    }

    console.log('Site provisioned successfully:', provisionResult.site_url)

    // Reload tenant record to get updated site_config with API credentials (allow time for bench to update)
    console.log('Reloading tenant record to get API credentials...')
    const updatedTenantList = await retryWithBackoff(
      async () => {
        return await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Tenant',
          filters: JSON.stringify({ name: tenant.name || tenant.subdomain }),
          fields: JSON.stringify(['*']),
          limit_page_length: 1
        })
      },
      6, // attempts
      5000, // 5s between retries to allow site_config to be written
      'Reload tenant after provisioning'
    )

    if (!updatedTenantList || updatedTenantList.length === 0) {
      console.error('Could not reload tenant record after provisioning')
      return {
        success: false,
        error: 'Site provisioned but could not retrieve credentials'
      }
    }

    const updatedTenant = updatedTenantList[0]

    console.log('API credentials retrieved successfully')
    
    // Parse site_config from tenant record
    if (!updatedTenant.site_config) {
      console.error('Provisioning incomplete: site_config is missing')
      return {
        success: false,
        error: 'Provisioning incomplete: Missing site configuration'
      }
    }

    const siteConfig = typeof updatedTenant.site_config === 'string' 
      ? JSON.parse(updatedTenant.site_config) 
      : updatedTenant.site_config

    console.log('📋 Site config received:', {
      has_api_key: !!siteConfig.api_key,
      has_api_secret: !!siteConfig.api_secret
    })
    
    if (!siteConfig.api_key || !siteConfig.api_secret) {
      console.error('Provisioning incomplete: API credentials missing from site_config')
      return {
        success: false,
        error: 'Provisioning incomplete: API credentials not generated'
      }
    }

    const siteName = `${subdomain}.localhost`
    
    console.log('🔑 Using admin credentials for initial user setup:', {
      siteName,
      adminPasswordLength: adminProvisionPassword.length
    })
    
    // CRITICAL: Wait for site to be fully initialized
    // New sites need time for database setup, cache warming, Administrator user creation
    console.log('⏳ Waiting 20 seconds for site initialization...')
    await delay(20000)  // Increased to 20s for admin user to be ready
    
    // STEP 1: Create User in the tenant site using admin password
    // NOTE: API keys aren't active immediately after provisioning, so we use admin login
    try {
      console.log('Creating user in tenant site:', data.email)
      
      // Check if user exists
      const existingUsers = await retryWithBackoff(
        async () => {
          return await tenantAdminRequest(
            'frappe.client.get_list',
            siteName,
            adminProvisionPassword,
            'POST',
            {
              doctype: 'User',
              filters: { email: data.email },
              fields: ['name', 'email'],
              limit_page_length: 1
            }
          )
        },
        5, // max attempts
        5000, // 5 seconds between retries
        'Check existing user'
      )

      console.log('User check result:', existingUsers)
      
      if (!existingUsers || existingUsers.length === 0) {
        // User doesn't exist, create it
        const [firstName, ...lastNameParts] = data.fullName.split(' ')
        
        const userResult = await retryWithBackoff(
          async () => {
            return await tenantAdminRequest(
              'frappe.client.insert',
              siteName,
              adminProvisionPassword,
              'POST',
              {
                doc: {
                  doctype: 'User',
                  email: data.email,
                  first_name: firstName,
                  last_name: lastNameParts.join(' ') || '',
                  send_welcome_email: 0,
                  user_type: 'System User',
                  enabled: 1
                }
              }
            )
          },
          5, // max attempts
          5000, // 5 seconds between retries
          'Create user'
        )

        console.log('User creation result:', userResult)

        // Now set the password
        console.log('Setting user password...')
        const passwordResult = await retryWithBackoff(
          async () => {
            return await tenantAdminRequest(
              'frappe.core.doctype.user.user.update_password',
              siteName,
              adminProvisionPassword,
              'POST',
              {
                new_password: data.password,
                user: data.email
              }
            )
          },
          5, // max attempts
          5000, // 5 seconds between retries
          'Set user password'
        )

        console.log('Password set result:', passwordResult)

        console.log('✅ User created and password set successfully')
      } else {
        console.log('User already exists, skipping creation')
      }
    } catch (userError) {
      console.error('Failed to create user in tenant site:', userError)
      // SECURITY: Don't expose internal error details to users
      return {
        success: false,
        error: 'Failed to set up user account. Please try again or contact support.'
      }
    }

    // STEP 2: Create organization in the tenant site
    try {
      console.log('Creating organization in tenant site')
      await retryWithBackoff(
        async () => {
          return await tenantAdminRequest(
            'frappe.client.insert',
            siteName,
            adminProvisionPassword,
            'POST',
            {
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
            }
          )
        },
        5, // max attempts
        5000, // 5 seconds between retries
        'Create organization'
      )
      console.log('✅ Organization created successfully')
    } catch (orgError) {
      console.error('Failed to create organization in tenant site:', orgError)
      // Continue anyway - organization can be created later
    }

    // STEP 3: Login to the tenant site with the user credentials
    try {
      const baseUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
      console.log('Logging into tenant site:', baseUrl, 'Site:', siteName)
      
      const loginResponse = await fetch(`${baseUrl}/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-Site-Name': siteName
        },
        body: new URLSearchParams({
          usr: data.email,
          pwd: data.password
        })
      })

      if (loginResponse.ok) {
        // Extract session cookie
        const setCookieHeader = loginResponse.headers.get('set-cookie')
        if (setCookieHeader) {
          const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
          if (sidMatch) {
            const cookieStore = await cookies()
            
            // Set session cookie for the tenant site
            cookieStore.set('sid', sidMatch[1], {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7 // 7 days
            })
            
            // Set user email
            cookieStore.set('user_email', data.email, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7
            })
            
            // CRITICAL: Mark as tenant user (not admin)
            cookieStore.set('user_type', 'tenant', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7
            })
            
            // Set tenant subdomain for routing
            cookieStore.set('tenant_subdomain', subdomain, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7
            })
            
            console.log('✅ Tenant login successful - cookies set:', {
              user: data.email,
              subdomain,
              userType: 'tenant'
            })
          }
        }
      }
    } catch (loginError) {
      console.error('Auto-login failed:', loginError)
      // User can login manually
    }

    // SECURITY: Clean up admin password from tenant config
    // Now that user/org creation is complete, remove the admin password
    try {
      console.log('🔒 [SECURITY] Removing admin password from tenant config')
      await cleanupTenantCredentials(tenant.name || tenant.subdomain)
    } catch (cleanupError) {
      console.error('⚠️ [SECURITY] Failed to cleanup admin credentials:', cleanupError)
      // Don't fail signup - this is a security best practice but not critical
    }

    return {
      success: true,
      tenantId: tenant.id,
      subdomain: subdomain,
      dashboardUrl: '/dashboard' // Simple redirect for now, middleware handles tenant routing
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
