import { cookies, headers } from 'next/headers'

// Single ERPNext instance configuration
const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET
const SITE_NAME = process.env.FRAPPE_SITE_NAME || 'erp.localhost'

/**
 * Get the current tenant's Frappe site name based on session cookies
 * Returns the full site name that Frappe should connect to
 */
async function getTenantSiteName(): Promise<string> {
  try {
    const cookieStore = await cookies()
    
    // Check if user is logged in as a tenant (set during login)
    const userType = cookieStore.get('user_type')?.value
    const tenantSiteUrl = cookieStore.get('tenant_site_url')?.value
    
    if (userType === 'tenant' && tenantSiteUrl) {
      // Extract site name from URL (remove protocol)
      const siteName = tenantSiteUrl.replace(/^https?:\/\//, '')
      console.log('Using tenant site:', siteName)
      return siteName
    }
    
    // Fallback: check for subdomain in headers (legacy support)
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id') || ''
    
    if (tenantId) {
      const baseDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'avariq.in'
      const isLocalhost = baseDomain.includes('localhost')
      
      if (isLocalhost) {
        return `${tenantId}.localhost`
      }
      return `${tenantId}.${baseDomain}`
    }
    
    // No tenant - use master site
    console.log('Using master site:', SITE_NAME)
    return SITE_NAME
  } catch (error) {
    console.warn('Failed to get tenant site name, falling back to master site:', error)
    return SITE_NAME
  }
}

/**
 * Make authenticated request as the logged-in user (uses session cookie)
 * Use this for user-specific operations (CRM, Fleet, Invoices, etc.)
 */
export async function userRequest(endpoint: string, method = 'GET', body: any = null) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('sid')
  
  if (!sessionCookie) {
    throw new Error('Not authenticated')
  }

  // Get tenant-specific site name
  const siteName = await getTenantSiteName()
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Cookie': `sid=${sessionCookie.value}`,
    'X-Frappe-Site-Name': siteName,
  }

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }

  let url = `${BASE_URL}/api/method/${endpoint}`
  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    credentials: 'include',
  }

  if (method === 'GET' && body) {
    const params = new URLSearchParams()
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })
    url += `?${params.toString()}`
  } else if (body) {
    fetchOptions.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(url, fetchOptions)
    const data = await res.json()

    if (!res.ok) {
      console.error('User API Error:', { status: res.status, data, siteName })
      throw new Error(data.message || data._server_messages || 'Request failed')
    }

    return data.message || data.data || data
  } catch (error: any) {
    console.error('User Request Failed:', error.message)
    throw error
  }
}

/**
 * Make request with API credentials (for admin operations)
 * Use this for system-level operations like creating users/organizations
 */
export async function frappeRequest(endpoint: string, method = 'GET', body: any = null) {
  if (!API_KEY || !API_SECRET) {
    throw new Error('ERP_API_KEY and ERP_API_SECRET must be set in environment variables')
  }

  const authHeader = `token ${API_KEY}:${API_SECRET}`
  
  // Get tenant-specific site name
  const siteName = await getTenantSiteName()
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Authorization': authHeader,
    'X-Frappe-Site-Name': siteName,
  }

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }

  let url = `${BASE_URL}/api/method/${endpoint}`
  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store', 
  }

  if (method === 'GET' && body) {
    const params = new URLSearchParams()
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })
    url += `?${params.toString()}`
  } else if (body) {
    fetchOptions.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(url, fetchOptions)
    const data = await res.json()

    if (!res.ok) {
      let errorMessage = 'API Error';
      
      console.error('ERPNext API Response:', {
        status: res.status,
        statusText: res.statusText,
        url: url,
        dataKeys: Object.keys(data || {}),
        data: JSON.stringify(data, null, 2)
      })
      
      if (typeof data.message === 'string') {
        errorMessage = data.message;
      } else if (data.message && typeof data.message === 'object') {
        errorMessage = data.message.message || JSON.stringify(data.message);
      }
      
      if (data._server_messages) {
        try {
          const messages = JSON.parse(data._server_messages);
          const firstMessage = messages[0];
          const inner = JSON.parse(firstMessage);
          errorMessage = inner.message || firstMessage;
        } catch (e) {
          errorMessage = JSON.parse(data._server_messages)[0];
        }
      }
      
      if (data.exception) {
        console.error("Frappe Exception:", data.exception)
        errorMessage = data.exception;
      }
      
      if (res.status !== 404) {
        console.error("ERPNext Error Details:", {
          message: errorMessage,
          fullData: data
        })
      }
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    }

    return data.message || data.data || data;
  } catch (error: any) {
    if (!error.message.includes("ERPNext Error") && !error.message.includes("not found")) {
      console.error("Frappe Request Failed:", error.message)
    }
    throw error
  }
}
