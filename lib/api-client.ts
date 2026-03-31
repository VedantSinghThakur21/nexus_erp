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
 * Make an authenticated request through the Next.js proxy API route.
 * Credentials are attached server-side from httpOnly cookies.
 * Never touches localStorage.
 *
 * @param path - Frappe method path (e.g. "frappe.client.get_list")
 * @param options - Standard fetch options (method, body, etc.)
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Normalise: strip leading slash
  const normalised = path.startsWith('/') ? path.slice(1) : path

  // Route through the secure Next.js proxy — credentials added server-side
  const url = `/api/proxy/${normalised}`

  try {
    const response = await fetch(url, {
      ...options,
      // Always send cookies so the server-side route can authenticate
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

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

      // Auto-redirect on auth failures (handled by the proxy route too, but
      // this keeps the client UX consistent)
      if (
        (response.status === 401 || response.status === 403) &&
        typeof window !== 'undefined'
      ) {
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
