/**
 * CVE-1 Fix: API Client — No localStorage Token Storage
 * ======================================================
 *
 * BEFORE (vulnerable): access_token, refresh_token, user_info were stored in
 * localStorage, making them accessible to ANY JavaScript on the page (XSS theft).
 *
 * AFTER (secure): All Frappe API requests are routed through Next.js server-side
 * API routes (/api/proxy/[...path]). Credentials (tenant_api_key / tenant_api_secret)
 * remain exclusively in httpOnly cookies on the server — never exposed to client JS.
 *
 * Client components call /api/proxy/* which acts as an authenticated proxy to Frappe.
 */

// ─── Error type ────────────────────────────────────────────────────────────────

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// ─── Core proxy request ────────────────────────────────────────────────────────

/**
 * Make an authenticated request.
 * - Server environment: Hits Frappe directly by reading cookies via next/headers
 * - Client environment: Hits Next.js /api/proxy/ loopback with credentials: 'include'
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isServer = typeof window === 'undefined'
  const normalised = path.startsWith('/') ? path.slice(1) : path

  let url: string = ''
  const finalHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  } as Record<string, string>

  if (isServer) {
    // Server environment (Server Action / Server Component)
    // Read the httpOnly cookies directly to attach Frappe credentials
    // Note: Calling `cookies()` acts dynamically during Server Rendering
    
    // We ignore if the import errors on client side, standard dynamic pattern
    try {
      const { cookies, headers } = await import('next/headers')
      const cookieStore = await cookies()
      const apiKey = cookieStore.get('tenant_api_key')?.value
      const apiSecret = cookieStore.get('tenant_api_secret')?.value

      if (apiKey && apiSecret) {
        finalHeaders['Authorization'] = `token ${apiKey}:${apiSecret}`
      } else {
        // Fallback to Env Master Keys
        const masterKey = process.env.ERP_API_KEY
        const masterSecret = process.env.ERP_API_SECRET
        if (masterKey && masterSecret) {
          finalHeaders['Authorization'] = `token ${masterKey}:${masterSecret}`
        }
      }

      // Automatically construct site name header
      const headersList = await headers()
      const tenantId = headersList.get('x-tenant-id')
      if (tenantId && tenantId !== 'master') {
             const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
             const IS_PRODUCTION = process.env.NODE_ENV === 'production'
             finalHeaders['X-Frappe-Site-Name'] = IS_PRODUCTION ? `${tenantId}.${ROOT_DOMAIN}` : `${tenantId}.localhost`
      } else {
             finalHeaders['X-Frappe-Site-Name'] = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
      }
    } catch (e) {
      console.error('[API-CLIENT] Error reading server cookies/headers:', e)
    }

    const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
    url = `${BASE_URL}/api/method/${normalised}`

  } else {
    // Client environment (Browser)
    // Uses the proxy pattern we established so JS can't see the tokens
    url = `/api/proxy/${normalised}`
  }

  try {
    const fetchOptions: RequestInit = {
      ...options,
      headers: finalHeaders,
    }
    
    // Append credentials flag for the proxy on the client side
    if (!isServer) {
      fetchOptions.credentials = 'include'
    }

    const response = await fetch(url, fetchOptions)

    const contentType = response.headers.get('content-type')
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as Record<string, unknown>).message)
          : typeof data === 'string'
            ? data
            : `Request failed with status ${response.status}`

      // Auto-redirect on auth failures for the client side
      if (!isServer && (response.status === 401 || response.status === 403)) {
        window.location.href = '/login'
      }

      throw new APIError(message, response.status, data)
    }

    return data as T
  } catch (error) {
    if (error instanceof APIError) throw error

    if (error instanceof Error) {
      throw new APIError(`Network error: ${error.message}`, undefined, error)
    }

    throw new APIError('Unknown error occurred')
  }
}

// ─── Convenience verbs ─────────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(path: string, options?: RequestInit): Promise<T> =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    apiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    apiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string, options?: RequestInit): Promise<T> =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
}

// ─── isAuthenticated helper ────────────────────────────────────────────────────

/**
 * Checks authentication by hitting the proxy health endpoint.
 * Never reads localStorage.
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const res = await fetch('/api/proxy/frappe.auth.get_logged_user', {
      credentials: 'include',
      method: 'POST',
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Type definitions ──────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  tenant: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
