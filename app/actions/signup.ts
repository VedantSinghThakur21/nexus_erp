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
 * Verify if a site actually exists by checking the site folder AND database connectivity
 * Don't trust DB records - verify actual site structure
 */
async function verifySiteExists(siteName: string): Promise<boolean> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)
  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    // Check 1: Site folder exists
    const checkFolderCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend test -d sites/${siteName}`
    await execAsync(checkFolderCmd, { timeout: 10000 })

    // Check 2: Site config file exists
    const checkConfigCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend test -f sites/${siteName}/site_config.json`
    await execAsync(checkConfigCmd, { timeout: 10000 })

    // Check 3: Database is accessible (most important check)
    const checkDbCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} list-apps"`
    const result = await execAsync(checkDbCmd, { timeout: 15000 })
    
    console.log('✅ Site verification passed:', siteName)
    return true
  } catch (error) {
    console.log('❌ Site verification failed:', siteName)
    return false
  }
}

/**
 * Ensure user has System Manager role and System User type
 * This fixes the "No App" error
 */
async function ensureUserPermissions(
  siteName: string,
  userEmail: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)
  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    console.log('🔐 Ensuring user permissions for:', userEmail)

    // Python script to set user as System User with System Manager role
    const pythonScript = `
import frappe
frappe.init(site='${siteName}')
frappe.connect()

try:
    user = frappe.get_doc('User', '${userEmail}')
    
    # Set user type to System User (not Website User)
    user.user_type = 'System User'
    user.enabled = 1
    
    # Ensure System Manager role exists
    has_system_manager = False
    for role in user.roles:
        if role.role == 'System Manager':
            has_system_manager = True
            break
    
    if not has_system_manager:
        user.append('roles', {'role': 'System Manager'})
    
    # Update password
    from frappe.utils.password import update_password
    update_password(user='${userEmail}', pwd='${password}', logout_all_sessions=0)
    
    user.save(ignore_permissions=True)
    frappe.db.commit()
    
    print('SUCCESS: User configured with System Manager role')
except Exception as e:
    print('ERROR: ' + str(e))
    raise
`

    const updateUserCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && echo '${pythonScript}' | /home/frappe/frappe-bench/env/bin/python"`
    
    const result = await execAsync(updateUserCmd, { timeout: 30000 })
    
    if (result.stdout.includes('SUCCESS')) {
      console.log('✅ User permissions configured successfully')
      
      // Verification: Check roles
      const verifyScript = `
import frappe
import json
frappe.init(site='${siteName}')
frappe.connect()
user = frappe.get_doc('User', '${userEmail}')
roles = [r.role for r in user.roles]
print(json.dumps({'user_type': user.user_type, 'roles': roles, 'enabled': user.enabled}))
`
      const verifyCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && echo '${verifyScript}' | /home/frappe/frappe-bench/env/bin/python"`
      const verifyResult = await execAsync(verifyCmd, { timeout: 15000 })
      
      console.log('👤 User verification:', verifyResult.stdout)
      
      return { success: true }
    }
    
    return { success: false, error: 'Failed to configure user permissions' }
  } catch (error: any) {
    console.error('❌ User permission setup failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Provision a real Frappe site with separate database for the tenant
 * Uses Node.js script for robust provisioning with proper verification
 */
async function provisionFrappeSite(
  siteName: string,
  adminPassword: string,
  adminEmail: string,
  companyName: string
): Promise<{ success: boolean; error?: string; isBackground?: boolean }> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    console.log('🚀 Provisioning Frappe site:', siteName)

    // ROBUST CHECK: Verify site actually exists (not just DB record)
    const siteExists = await verifySiteExists(siteName)
    
    if (siteExists) {
      console.log('✅ Site already exists and is valid:', siteName)
      
      // Even if site exists, ensure user has proper permissions
      const permResult = await ensureUserPermissions(siteName, adminEmail, adminPassword)
      if (!permResult.success) {
        console.warn('⚠️ Warning: Could not verify user permissions, but continuing')
      }
      
      return { success: true }
    }

    // Site doesn't exist - trigger background provisioning using the robust Node.js script
    console.log('🏗️ Site needs provisioning - starting background process')
    
    const scriptPath = process.cwd() + '/scripts/provision-tenant.js'
    const provisionCmd = `node "${scriptPath}" "${siteName.split('.')[0]}" "${adminEmail}" "${companyName}" "${adminPassword}" "${companyName}"`
    
    console.log('📝 Executing provisioning script (background)...')
    
    // Execute in background with detached process
    exec(provisionCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Background provisioning failed:', error.message)
        console.error('stderr:', stderr)
      } else {
        console.log('✅ Background provisioning completed:', stdout)
      }
    })
    
    // Return immediately to avoid 504 timeout
    // The provisioning will continue in background
    return { 
      success: true, 
      isBackground: true 
    }

  } catch (error: any) {
    console.error('❌ Site provisioning failed:', error.message)
    return { 
      success: false, 
      error: `Failed to provision site: ${error.message}` 
    }
  }
}

/**
 * Create tenant record and user in ERPNext without nexus_core app
 * Uses standard Frappe API to create Tenant doctype and User
 * Handles duplicates gracefully for idempotency
 */
async function provisionTenantSite(
  tenantName: string,
  adminPassword: string,
  companyName: string,
  email: string,
  siteName: string
): Promise<SignupResult> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('Server configuration error: API credentials not found')
  }

  const authHeader = `token ${API_KEY}:${API_SECRET}`
  const siteUrl = siteName

  try {
    console.log('Provisioning tenant:', { tenantName, companyName, email })

    // Step 1: Check if Tenant already exists
    const checkTenantEndpoint = `${BASE_URL}/api/resource/Tenant/${tenantName}`
    const checkTenantResponse = await fetch(checkTenantEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    })

    let tenantExists = checkTenantResponse.ok

    // If tenant exists but site doesn't exist, we need to recreate everything
    // This handles cases where tenant record exists but site was dropped
    if (tenantExists) {
      console.log('✅ Tenant record exists:', tenantName)

      // Check if the actual site exists
      const siteExists = await verifySiteExists(siteName)
      if (!siteExists) {
        console.log('⚠️ Tenant record exists but site is missing - will recreate site')

        // Delete the old tenant record so we can recreate it
        try {
          const deleteTenantEndpoint = `${BASE_URL}/api/resource/Tenant/${tenantName}`
          await fetch(deleteTenantEndpoint, {
            method: 'DELETE',
            headers: {
              'Authorization': authHeader,
            },
          })
          console.log('🗑️ Deleted old tenant record')
          tenantExists = false // Force recreation
        } catch (deleteError) {
          console.warn('⚠️ Could not delete old tenant record, continuing anyway')
        }
      }
    }

    if (!tenantExists) {
      // Step 2: Create Tenant if it doesn't exist
      const tenantEndpoint = `${BASE_URL}/api/resource/Tenant`

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

        // If duplicate error (race condition), treat as success
        if (tenantData.exception && tenantData.exception.includes('DuplicateEntryError')) {
          console.log('✅ Tenant already exists (race condition)')
        } else {
          return {
            success: false,
            error: tenantData.exception || tenantData.message || 'Failed to create tenant record',
          }
        }
      } else {
        console.log('✅ Tenant created successfully')
      }
    }

    // Step 3: Check if User already exists
    const checkUserEndpoint = `${BASE_URL}/api/resource/User/${email}`
    const checkUserResponse = await fetch(checkUserEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    })

    const userExists = checkUserResponse.ok

    if (userExists) {
      console.log('✅ User already exists:', email)
      // User exists, we're done
      return {
        success: true,
        site_url: siteUrl,
        tenant_name: tenantName,
      }
    }

    // Step 4: Create User if doesn't exist
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

      // If duplicate error (race condition), treat as success
      if (userData.exception && userData.exception.includes('DuplicateEntryError')) {
        console.log('✅ User already exists (race condition)')
        return {
          success: true,
          site_url: siteUrl,
          tenant_name: tenantName,
        }
      }

      return {
        success: false,
        error: userData.exception || userData.message || 'Failed to create user account',
      }
    }

    console.log('✅ User created successfully')

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

    // 3. Provision real Frappe site with separate database
    const siteName = `${tenantName}.${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'avariq.in'}`
    const siteResult = await provisionFrappeSite(siteName, password, email, companyName)

    if (!siteResult.success) {
      return {
        success: false,
        error: siteResult.error || 'Failed to provision tenant site',
      }
    }

    // 4. Create Tenant record in master site for tracking (only if site provisioning succeeded)
    const result = await provisionTenantSite(tenantName, password, companyName, email, siteName)

    if (!result.success) {
      return result
    }

    // If background provisioning, redirect to status page immediately
    if (siteResult.isBackground) {
      console.log('🔀 Redirecting to provisioning status page')
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const baseHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000'
      const statusUrl = `${protocol}://${baseHost}/provisioning?tenant=${result.tenant_name || tenantName}&email=${encodeURIComponent(email)}`

      redirect(statusUrl)
    }

    // 5. Wait for site to be fully ready (only for existing sites)
    const waitTime = 3000
    console.log(`⏳ Waiting ${waitTime/1000}s for site to initialize...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    
    // 5.5. Verify user has proper permissions before login
    const permCheck = await ensureUserPermissions(siteName, email, password)
    if (!permCheck.success) {
      console.warn('⚠️ Could not verify user permissions, attempting login anyway')
    }

    // 6. Login the user to the tenant's site
    const tenantSiteUrl = `http://localhost:8080`  // All sites accessible via same port
    const loginEndpoint = `${tenantSiteUrl}/api/method/login`
    
    try {
      const loginResponse = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-Site-Name': siteName,  // Tell Frappe which site to use
        },
        body: new URLSearchParams({
          usr: email,
          pwd: password
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

    
    if (loginResponse.ok) {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      
      // Extract session cookies from ERPNext
      const setCookieHeader = loginResponse.headers.get('set-cookie')
      if (setCookieHeader) {
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        if (sidMatch) {
          cookieStore.set('sid', sidMatch[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          })
        }
      }
      
      cookieStore.set('user_email', email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })
      cookieStore.set('tenant_subdomain', result.tenant_name || tenantName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })
    } else {
      console.warn('Login failed after provisioning, redirecting to login page')
    }
    } catch (loginError: any) {
      console.error('Login attempt failed:', loginError.message)
      // Continue with redirect even if login fails - user can login manually
    }
    
    // 7. Redirect to tenant subdomain (e.g., https://vfixit.avariq.in)
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000'
    const tenantUrl = `${protocol}://${result.tenant_name || tenantName}.${baseHost}/dashboard`
    
    console.log('Redirecting to tenant subdomain:', tenantUrl)
    redirect(tenantUrl)

  } catch (error: any) {
    // Re-throw redirect errors (they are not actual errors, just flow control)
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    console.error('Signup error:', error)

    return {
      success: false,
      error: error.message || 'An unexpected error occurred during signup',
    }
  }
}
