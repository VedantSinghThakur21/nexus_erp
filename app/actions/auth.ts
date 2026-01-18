'use server'

import { cookies } from 'next/headers'
import { frappeRequest } from '@/app/lib/api'

// Helper to find which tenant belongs to an email
async function findTenantForEmail(email: string) {
  try {
    // 1. Search in Master Site "SaaS Tenant" DocType
    // We filter tenants where owner_email matches
    const tenants = await frappeRequest(
        'frappe.client.get_list', 
        'GET', 
        {
            doctype: 'SaaS Tenant',
            filters: `[["owner_email", "=", "${email}"]]`,
            fields: '["subdomain", "site_url", "site_config", "status", "api_key", "api_secret"]',
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
  
  console.log(`Attempting login for: ${email}`);

  // Default to Master URL
  let targetUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  let siteHeader = process.env.FRAPPE_SITE_NAME_HEADER || 'localhost'

  try {
    // 1. Lookup Tenant
    const tenant = await findTenantForEmail(email)
    
    if (tenant) {
        console.log(`Found tenant: ${tenant.subdomain}`);
        // If tenant found, we must target their site
        targetUrl = 'http://127.0.0.1:8080' // Keep hitting local Docker port
        siteHeader = `${tenant.subdomain}.localhost` // Force the Host header
    } else {
        console.log("No tenant found. Attempting login on master site.");
    }

    console.log(`Authenticating against site: ${siteHeader}`);

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
      
      // 3. Set Session Cookie
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
        const sid = setCookieHeader.match(/sid=([^;]+)/)?.[1]
        if (sid) {
            cookieStore.set('sid', sid, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                path: '/' 
            })
        }
      }

      // 4. Set Context Cookies
      cookieStore.set('user_id', email, { path: '/' })
      if (tenant) {
          cookieStore.set('tenant_id', tenant.subdomain, { path: '/' })
          cookieStore.set('tenant_site_url', tenant.site_url || `https://${tenant.subdomain}.avariq.in`, { path: '/' })
          
          // Store tenant API credentials fetched from master database
          if (tenant.api_key && tenant.api_secret) {
              console.log(`✅ Tenant API credentials loaded for: ${tenant.subdomain}`)
              cookieStore.set('tenant_api_key', tenant.api_key, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' })
              cookieStore.set('tenant_api_secret', tenant.api_secret, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' })
          } else {
              console.log(`⚠️ No API credentials found in master database for tenant: ${tenant.subdomain}`)
              console.log(`Please ensure the SaaS Tenant record has api_key and api_secret fields populated`)
          }
      }

      console.log("Login successful.");
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