'use server'

import { cookies } from 'next/headers'
import { frappeRequest } from '@/app/lib/api'

// Extract base domain from URL (e.g., 'https://app.avariq.in' -> 'avariq.in')
function getBaseDomain(url: string | undefined): string | null {
  if (!url) return null
  try {
    const hostname = new URL(url).hostname
    // Split by dots and take last two parts (e.g., 'app.avariq.in' -> 'avariq.in')
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    return null
  } catch {
    return null
  }
}

// Helper to find which tenant belongs to an email
async function findTenantForEmail(email: string) {
  try {
    // Search in Master Site "SaaS Tenant" DocType
    // Uses master site credentials since user_type cookie isn't set yet
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
    return tenants.length > 0 ? tenants[0] : null
  } catch (e) {
    console.error("Tenant lookup failed:", e)
    return null
  }
}

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  console.log(`Attempting login for: ${email}`)

  // Calculate base domain for cross-subdomain cookies
  const baseDomain = getBaseDomain(process.env.NEXT_PUBLIC_APP_URL)

  // Default to Master URL
  let targetUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  let siteHeader = process.env.FRAPPE_SITE_NAME_HEADER || 'localhost'

  try {
    // 1. Lookup Tenant (uses master site via X-Frappe-Site-Name header)
    const tenant = await findTenantForEmail(email)
    
    if (tenant) {
        console.log(`Found tenant: ${tenant.subdomain}`)
        // If tenant found, we must target their site
        targetUrl = 'http://127.0.0.1:8080' // Keep hitting local Docker port
        siteHeader = `${tenant.subdomain}.localhost` // Force the Host header
    } else {
        console.log("No tenant found. Attempting login on master site.")
    }

    console.log(`Authenticating against site: ${siteHeader}`)

    // 2. Perform Login
    const response = await fetch(`${targetUrl}/api/method/login`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': siteHeader, // Required for Nginx/Traefik routing
          'X-Frappe-Site-Name': siteHeader // Backup for Frappe app routing
      },
      body: new URLSearchParams({ usr: email, pwd: password }),
    })

    const data = await response.json()

    if (response.ok && data.message === 'Logged In') {
      const cookieStore = await cookies()
      
      // Cookie options - with domain for cross-subdomain access in production
      const secureCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        ...(process.env.NODE_ENV === 'production' && baseDomain ? { domain: `.${baseDomain}` } : {})
      }
      
      const publicCookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        ...(process.env.NODE_ENV === 'production' && baseDomain ? { domain: `.${baseDomain}` } : {})
      }

      // 3. Set Session Cookie (httpOnly)
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
        const sid = setCookieHeader.match(/sid=([^;]+)/)?.[1]
        if (sid) {
          cookieStore.set('sid', sid, secureCookieOptions)
        }
      }

      // 4. Set Context Cookies
      cookieStore.set('user_id', email, publicCookieOptions)
      
      if (tenant) {
        cookieStore.set('user_type', 'tenant', publicCookieOptions)
        cookieStore.set('tenant_subdomain', tenant.subdomain, publicCookieOptions)
        
        // Store tenant API credentials (httpOnly for security)
        if (tenant.api_key && tenant.api_secret) {
          console.log(`✅ Tenant API credentials loaded for: ${tenant.subdomain}`)
          cookieStore.set('tenant_api_key', tenant.api_key, secureCookieOptions)
          cookieStore.set('tenant_api_secret', tenant.api_secret, secureCookieOptions)
        } else {
          console.error(`❌ ERROR: Tenant "${tenant.subdomain}" found but api_key/api_secret are missing!`)
          console.error(`Please populate the api_key and api_secret fields in the SaaS Tenant record.`)
          console.error(`Without these credentials, API calls to the tenant site will fail.`)
        }
      } else {
        cookieStore.set('user_type', 'admin', publicCookieOptions)
      }

      console.log("Login successful.")
      return { success: true }
    } else {
      console.error("Login failed response:", data)
      return { error: data.message || 'Invalid credentials' }
    }
  } catch (error: any) {
    console.error("Auth Error:", error)
    return { error: 'Failed to connect to ERP server' }
  }
}
