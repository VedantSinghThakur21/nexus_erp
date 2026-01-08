import { cookies, headers } from 'next/headers'

const BASE_URL = process.env.ERP_NEXT_URL
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET

/**
 * Get the appropriate ERPNext URL based on tenant context
 * Reads from middleware-set headers
 */
async function getERPNextURL(): Promise<string> {
  try {
    const headersList = await headers()
    const tenantUrl = headersList.get('X-ERPNext-URL')
    
    if (tenantUrl) {
      return tenantUrl
    }
  } catch (error) {
    // Headers might not be available in all contexts
    console.warn('Could not read headers for tenant URL')
  }
  
  // Fallback to master site
  return BASE_URL || 'http://103.224.243.242:8080'
}

/**
 * Make authenticated request as the logged-in user (uses session cookie)
 * Use this for user-specific operations
 * Automatically routes to the correct tenant site
 */
export async function userRequest(endpoint: string, method = 'GET', body: any = null) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('sid')
  
  if (!sessionCookie) {
    throw new Error('Not authenticated')
  }

  const erpnextUrl = await getERPNextURL()

  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Cookie': `sid=${sessionCookie.value}`,
  }

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }

  let url = `${erpnextUrl}/api/method/${endpoint}`
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
      console.error('User API Error:', { status: res.status, data })
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
 * Use this only for system-level operations like creating users/organizations
 * For multi-tenant: This always hits the MASTER site for tenant management
 */
export async function frappeRequest(endpoint: string, method = 'GET', body: any = null, useTenantUrl = false) {
  // We prefer API Key/Secret for stability (Bypasses CSRF issues)
  const authHeader = `token ${API_KEY}:${API_SECRET}`
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Authorization': authHeader, // <--- Using Keys instead of Cookie
  }

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }

  // Determine which URL to use
  let erpnextUrl = BASE_URL || 'http://103.224.243.242:8080'
  if (useTenantUrl) {
    erpnextUrl = await getERPNextURL()
  }

  // Build the URL and Request Options
  let url = `${erpnextUrl}/api/method/${endpoint}`
  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store', 
  }

  // Handle GET vs POST body logic
  if (method === 'GET' && body) {
    // For GET requests, data must go in the URL Query Params, not the body
    const params = new URLSearchParams()
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Ensure values are strings
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })
    url += `?${params.toString()}`
  } else if (body) {
    // For POST/PUT, data goes in the Body
    fetchOptions.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(url, fetchOptions)

    const data = await res.json()

    if (!res.ok) {
      // Improved Error Parsing for Frappe
      let errorMessage = 'API Error';
      
      // Log full response for debugging
      console.error('ERPNext API Response:', {
        status: res.status,
        statusText: res.statusText,
        url: url,
        dataKeys: Object.keys(data || {}),
        data: JSON.stringify(data, null, 2)
      })
      
      // Safely extract error message
      if (typeof data.message === 'string') {
        errorMessage = data.message;
      } else if (data.message && typeof data.message === 'object') {
        errorMessage = data.message.message || JSON.stringify(data.message);
      }
      
      if (data._server_messages) {
        try {
          const messages = JSON.parse(data._server_messages);
          const firstMessage = messages[0];
          // Frappe messages are often double-encoded JSON strings
          const inner = JSON.parse(firstMessage);
          errorMessage = inner.message || firstMessage;
        } catch (e) {
          // If parsing fails, just use the raw string
          errorMessage = JSON.parse(data._server_messages)[0];
        }
      }
      
      // Examine exception field if present
      if (data.exception) {
        console.error("Frappe Exception:", data.exception)
        errorMessage = data.exception;
      }
      
      // Log errors only if it's NOT a 404 (Not Found)
      // This prevents console spam when a user clicks a bad link
      if (res.status !== 404) {
        console.error("ERPNext Error Details:", {
          message: errorMessage,
          fullData: data
        })
      }
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    }

    // Safely return data, ensuring we don't return objects that might be rendered
    const result = data.message || data.data || data;
    return result
  } catch (error: any) {
    // Don't re-log if we already logged it above
    if (!error.message.includes("ERPNext Error") && !error.message.includes("not found")) {
        console.error("Frappe Request Failed:", error.message)
    }
    throw error
  }
}

/**
 * Make request to tenant site using tenant's API credentials
 * Reads tenant config from middleware headers
 * Use this for operations on tenant data when no user session is available
 */
export async function tenantRequest(endpoint: string, method = 'GET', body: any = null) {
  try {
    const headersList = await headers()
    const tenantMode = headersList.get('X-Tenant-Mode')
    
    // If not in tenant mode, fall back to regular request
    if (tenantMode !== 'tenant') {
      return frappeRequest(endpoint, method, body, true)
    }
    
    const erpnextUrl = await getERPNextURL()
    
    // For tenant requests, we need to fetch tenant's API keys from the Tenant DocType
    // First get the subdomain
    const subdomain = headersList.get('X-Subdomain')
    if (!subdomain) {
      throw new Error('No subdomain found in tenant mode')
    }
    
    // Fetch tenant config from master site to get API keys
    const tenantConfigResponse = await fetch(`${BASE_URL}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${API_KEY}:${API_SECRET}`
      },
      body: JSON.stringify({
        doctype: 'Tenant',
        filters: { subdomain },
        fields: ['site_config'],
        limit_page_length: 1
      })
    })
    
    const tenantConfigData = await tenantConfigResponse.json()
    if (!tenantConfigData.message || tenantConfigData.message.length === 0) {
      throw new Error('Tenant configuration not found')
    }
    
    let siteConfig = tenantConfigData.message[0].site_config
    if (typeof siteConfig === 'string') {
      siteConfig = JSON.parse(siteConfig)
    }
    
    const tenantApiKey = siteConfig.api_key
    const tenantApiSecret = siteConfig.api_secret
    
    if (!tenantApiKey || !tenantApiSecret) {
      throw new Error('Tenant API credentials not found')
    }
    
    // Make request using tenant's credentials
    const authHeader = `token ${tenantApiKey}:${tenantApiSecret}`
    
    const requestHeaders: HeadersInit = {
      'Accept': 'application/json',
      'Authorization': authHeader,
    }
    
    if (method !== 'GET') {
      requestHeaders['Content-Type'] = 'application/json'
    }
    
    let url = `${erpnextUrl}/api/method/${endpoint}`
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
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
    
    const res = await fetch(url, fetchOptions)
    const data = await res.json()
    
    if (!res.ok) {
      console.error('Tenant API Error:', { status: res.status, data })
      throw new Error(data.message || 'Tenant request failed')
    }
    
    return data.message || data.data || data
  } catch (error: any) {
    console.error('Tenant Request Failed:', error.message)
    throw error
  }
}
