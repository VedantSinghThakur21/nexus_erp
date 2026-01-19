'use server'

import { cookies } from 'next/headers'
import { frappeRequest } from '@/app/lib/api'

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const ERP_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get cookie options for cross-subdomain access
 * In production: Sets domain to .avariq.in so cookies work across all subdomains
 * In development: No domain set (localhost doesn't support subdomain cookies)
 */
function getCookieOptions(httpOnly: boolean = false) {
  const options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax' | 'strict' | 'none'
    path: string
    maxAge: number
    domain?: string
  } = {
    httpOnly,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }

  // CRITICAL: Set domain for cross-subdomain cookies in production
  if (IS_PRODUCTION && ROOT_DOMAIN) {
    options.domain = `.${ROOT_DOMAIN}` // Leading dot allows subdomain access
    console.log(`[Auth] Cookie domain set to: .${ROOT_DOMAIN}`)
  }

  return options
}

/**
 * Find tenant by owner email from Master DB
 * Returns tenant with subdomain, status, api_key, api_secret
 */
async function findTenantForEmail(email: string): Promise<{
  subdomain: string
  status: string
  api_key: string | null
  api_secret: string | null
} | null> {
  console.log(`[Auth] Looking up tenant for email: ${email}`)
  
  try {
    const tenants = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'SaaS Tenant',
        filters: `[["owner_email", "=", "${email}"]]`,
        fields: '["subdomain", "status", "api_key", "api_secret"]',
        limit_page_length: 1
      }
    )

    if (tenants && tenants.length > 0) {
      const tenant = tenants[0]
      console.log(`[Auth] ✅ Found tenant: ${tenant.subdomain} (status: ${tenant.status})`)
      console.log(`[Auth] API Key present: ${!!tenant.api_key}, API Secret present: ${!!tenant.api_secret}`)
      return tenant
    }

    console.log(`[Auth] ⚠️ No tenant found for email: ${email}`)
    return null
  } catch (error) {
    console.error(`[Auth] ❌ Tenant lookup failed:`, error)
    return null
  }
}

/**
 * Compute the Frappe site name for a tenant
 */
function getTenantSiteName(subdomain: string): string {
  if (IS_PRODUCTION) {
    return `${subdomain}.${ROOT_DOMAIN}`
  }
  // In development, use .localhost for Frappe multi-tenancy
  return `${subdomain}.localhost`
}

// ============================================================================
// MAIN LOGIN FUNCTION
// ============================================================================

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`[Auth] Login attempt for: ${email}`)
  console.log(`[Auth] Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`)
  console.log(`[Auth] Root Domain: ${ROOT_DOMAIN}`)

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  try {
    // ========================================================================
    // STEP 1: Lookup Tenant in Master DB
    // ========================================================================
    console.log('[Auth] Step 1: Looking up tenant in Master DB...')
    const tenant = await findTenantForEmail(email)

    let targetSiteName: string
    let isTenantUser = false

    if (tenant) {
      isTenantUser = true
      targetSiteName = getTenantSiteName(tenant.subdomain)
      console.log(`[Auth] Will authenticate against tenant site: ${targetSiteName}`)
    } else {
      targetSiteName = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
      console.log(`[Auth] Will authenticate against master site: ${targetSiteName}`)
    }

    // ========================================================================
    // STEP 2: Authenticate User Against Frappe
    // ========================================================================
    console.log(`[Auth] Step 2: Authenticating against ${targetSiteName}...`)

    const loginResponse = await fetch(`${ERP_URL}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': targetSiteName,
        'X-Frappe-Site-Name': targetSiteName,
      },
      body: new URLSearchParams({ usr: email, pwd: password }),
    })

    const loginData = await loginResponse.json()

    if (!loginResponse.ok || loginData.message !== 'Logged In') {
      console.error(`[Auth] ❌ Login failed:`, loginData)
      return { error: loginData.message || 'Invalid email or password' }
    }

    console.log(`[Auth] ✅ Authentication successful for: ${email}`)

    // ========================================================================
    // STEP 3: Extract Session ID from Response
    // ========================================================================
    const setCookieHeader = loginResponse.headers.get('set-cookie')
    let sessionId: string | null = null

    if (setCookieHeader) {
      const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
      if (sidMatch) {
        sessionId = sidMatch[1]
        console.log(`[Auth] Session ID extracted: ${sessionId.substring(0, 20)}...`)
      }
    }

    // ========================================================================
    // STEP 4: Set Cookies with Proper Scope
    // ========================================================================
    console.log('[Auth] Step 4: Setting cookies...')
    
    const cookieStore = await cookies()
    const secureCookieOptions = getCookieOptions(true)  // httpOnly = true
    const publicCookieOptions = getCookieOptions(false) // httpOnly = false

    // Session cookie
    if (sessionId) {
      cookieStore.set('sid', sessionId, secureCookieOptions)
      console.log(`[Auth] ✅ Set cookie: sid`)
    }

    // User identification
    cookieStore.set('user_id', email, publicCookieOptions)
    console.log(`[Auth] ✅ Set cookie: user_id = ${email}`)

    if (isTenantUser && tenant) {
      // ======================================================================
      // TENANT USER COOKIES
      // ======================================================================
      cookieStore.set('user_type', 'tenant', publicCookieOptions)
      cookieStore.set('tenant_subdomain', tenant.subdomain, publicCookieOptions)
      console.log(`[Auth] ✅ Set cookie: user_type = tenant`)
      console.log(`[Auth] ✅ Set cookie: tenant_subdomain = ${tenant.subdomain}`)

      // CRITICAL: Store API credentials for tenant API calls
      if (tenant.api_key && tenant.api_secret) {
        cookieStore.set('tenant_api_key', tenant.api_key, secureCookieOptions)
        cookieStore.set('tenant_api_secret', tenant.api_secret, secureCookieOptions)
        console.log(`[Auth] ✅ Set cookie: tenant_api_key (httpOnly)`)
        console.log(`[Auth] ✅ Set cookie: tenant_api_secret (httpOnly)`)
        console.log(`[Auth] 🔐 Tenant API credentials successfully stored in cookies`)
      } else {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error(`[Auth] ❌ CRITICAL ERROR: Tenant "${tenant.subdomain}" has no API credentials!`)
        console.error(`[Auth] The SaaS Tenant record in master DB is missing api_key/api_secret.`)
        console.error(`[Auth] This will cause "Tenant API credentials not found" errors.`)
        console.error(`[Auth] Please run the provisioning script or manually populate these fields.`)
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        // Still allow login but warn - user can see dashboard, just API calls will fail
      }
    } else {
      // ======================================================================
      // ADMIN USER COOKIES
      // ======================================================================
      cookieStore.set('user_type', 'admin', publicCookieOptions)
      console.log(`[Auth] ✅ Set cookie: user_type = admin`)
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`[Auth] ✅ LOGIN COMPLETE for ${email}`)
    console.log(`[Auth] User Type: ${isTenantUser ? 'Tenant' : 'Admin'}`)
    if (isTenantUser && tenant) {
      console.log(`[Auth] Tenant: ${tenant.subdomain}`)
      console.log(`[Auth] Has API Credentials: ${!!(tenant.api_key && tenant.api_secret)}`)
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return { success: true }
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`[Auth] ❌ LOGIN ERROR:`, error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return { error: 'Failed to connect to authentication server' }
  }
}

// ============================================================================
// LOGOUT FUNCTION
// ============================================================================

export async function logout() {
  console.log('[Auth] Logging out user...')
  
  const cookieStore = await cookies()
  const cookieNames = [
    'sid',
    'user_id',
    'user_type',
    'tenant_subdomain',
    'tenant_api_key',
    'tenant_api_secret',
  ]

  const deleteOptions = getCookieOptions(false)

  for (const name of cookieNames) {
    try {
      cookieStore.delete({ name, ...deleteOptions })
      console.log(`[Auth] Deleted cookie: ${name}`)
    } catch {
      // Cookie might not exist
    }
  }

  console.log('[Auth] ✅ Logout complete')
  return { success: true }
}
