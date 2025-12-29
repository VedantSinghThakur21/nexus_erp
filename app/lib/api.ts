import { cookies } from 'next/headers'

const BASE_URL = process.env.ERP_NEXT_URL
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET

export async function frappeRequest(endpoint: string, method = 'GET', body: any = null) {
  // We prefer API Key/Secret for stability (Bypasses CSRF issues)
  const authHeader = `token ${API_KEY}:${API_SECRET}`
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Authorization': authHeader, // <--- Using Keys instead of Cookie
  }

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }

  // Build the URL and Request Options
  let url = `${BASE_URL}/api/method/${endpoint}`
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
        data: data,
        url: url
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
      
      // Log errors only if it's NOT a 404 (Not Found)
      // This prevents console spam when a user clicks a bad link
      if (res.status !== 404) {
        console.error("ERPNext Error:", errorMessage)
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
