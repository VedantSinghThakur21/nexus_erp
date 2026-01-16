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
 * Provision a real Frappe site with separate database for the tenant
 * Uses Docker exec to run bench commands
 */
async function provisionFrappeSite(
  siteName: string,
  adminPassword: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'
  const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'admin'

  try {
    console.log('🚀 Provisioning Frappe site:', siteName)

    // Check if site already exists
    const checkCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend ls sites/${siteName} 2>/dev/null`
    try {
      await execAsync(checkCmd)
      console.log('✅ Site already exists:', siteName)
      return { success: true }
    } catch {
      // Site doesn't exist, proceed with creation
    }

    // Create the site with separate database
    const dbName = siteName.replace(/[.-]/g, '_')
    const createSiteCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench new-site ${siteName} --admin-password '${adminPassword}' --db-name ${dbName} --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket"`

    console.log('📝 Creating new site...')
    await execAsync(createSiteCmd, { timeout: 120000 }) // 2 minute timeout

    // Install ERPNext
    const installCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} install-app erpnext"`
    
    console.log('🔧 Installing ERPNext...')
    await execAsync(installCmd, { timeout: 180000 }) // 3 minute timeout

    // Create admin user
    const addUserCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} add-system-manager '${adminEmail}' '${adminPassword}'"`
    
    console.log('👤 Creating admin user...')
    try {
      await execAsync(addUserCmd, { timeout: 60000 })
    } catch (error: any) {
      // Ignore if user already exists
      console.log('Note: Admin user may already exist')
    }

    console.log('✅ Site provisioned successfully:', siteName)
    return { success: true }

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
  email: string
): Promise<SignupResult> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('Server configuration error: API credentials not found')
  }

  const authHeader = `token ${API_KEY}:${API_SECRET}`
  const siteUrl = `${tenantName}.${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'avariq.in'}`

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

    const tenantExists = checkTenantResponse.ok

    if (tenantExists) {
      console.log('✅ Tenant already exists:', tenantName)
      // Tenant exists, now ensure User exists too
    } else {
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
    const siteResult = await provisionFrappeSite(siteName, password, email)

    if (!siteResult.success) {
      return {
        success: false,
        error: siteResult.error || 'Failed to provision tenant site',
      }
    }

    // 4. Create Tenant record in master site for tracking
    const result = await provisionTenantSite(tenantName, password, companyName, email)

    if (!result.success) {
      return result
    }

    // 5. Login the user to the tenant's site
    const tenantSiteUrl = `http://localhost:8080`  // All sites accessible via same port
    const loginEndpoint = `${tenantSiteUrl}/api/method/login`
    const loginResponse = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Frappe-Site-Name': siteName,  // Tell Frappe which site to use
      },
      body: new URLSearchParams({
        usr: email,
        pwd: password
      })
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
    }
    
    // 5. Redirect to tenant subdomain (e.g., https://vfixit.avariq.in)
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
