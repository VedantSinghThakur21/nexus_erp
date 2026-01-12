/**
 * Backend API URL Resolver for Multi-Tenant SaaS
 * 
 * Dynamically resolves backend API URL based on current hostname
 * Supports local development and production environments
 * 
 * Examples:
 * - tenant1.localhost:3000 → api.tenant1.localhost:8080
 * - tenant2.example.com → api.tenant2.example.com
 * - localhost:3000 → api.localhost:8080 (default tenant)
 */

interface BackendConfig {
  protocol: 'http' | 'https'
  port?: number
  apiPrefix?: string
}

/**
 * Extracts tenant from current hostname
 * Returns subdomain or 'default' for apex domains
 */
function extractTenant(hostname: string): string {
  const host = hostname.split(':')[0]
  const parts = host.split('.')
  
  // subdomain.localhost → "subdomain"
  if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
    return parts[0]
  }
  
  // subdomain.example.com → "subdomain"
  if (parts.length > 2) {
    return parts[0]
  }
  
  // localhost or example.com → "default"
  return 'default'
}

/**
 * Resolves backend API URL based on current hostname
 * 
 * @param config - Optional configuration for protocol, port, and API prefix
 * @returns Backend API URL (e.g., "https://api.tenant1.example.com")
 */
export function getBackendURL(config?: BackendConfig): string {
  if (typeof window === 'undefined') {
    throw new Error('getBackendURL can only be called in browser environment')
  }
  
  const hostname = window.location.hostname
  const tenant = extractTenant(hostname)
  
  // Determine environment
  const isLocalhost = hostname.includes('localhost') || hostname === '127.0.0.1'
  
  // Default configuration
  const protocol = config?.protocol || (isLocalhost ? 'http' : 'https')
  const port = config?.port || (isLocalhost ? 8080 : undefined)
  const apiPrefix = config?.apiPrefix || 'api'
  
  // Build backend hostname
  let backendHostname: string
  
  if (isLocalhost) {
    // Local development: api.tenant.localhost
    if (tenant === 'default') {
      backendHostname = `${apiPrefix}.localhost`
    } else {
      backendHostname = `${apiPrefix}.${tenant}.localhost`
    }
  } else {
    // Production: api.tenant.example.com or api.example.com
    const parts = hostname.split('.')
    
    if (parts.length > 2) {
      // tenant.example.com → api.tenant.example.com
      parts[0] = apiPrefix
      backendHostname = parts.join('.')
    } else {
      // example.com → api.example.com
      backendHostname = `${apiPrefix}.${hostname}`
    }
  }
  
  // Construct full URL
  const portSuffix = port ? `:${port}` : ''
  return `${protocol}://${backendHostname}${portSuffix}`
}

/**
 * Get OAuth token from localStorage or sessionStorage
 * Customize this based on your auth implementation
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  
  // Try multiple storage locations
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('access_token') ||
    null
  )
}

/**
 * Error class for API-related errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Authenticated API request wrapper
 * Automatically adds Authorization header with Bearer token
 * 
 * @param endpoint - API endpoint path (e.g., "/users/me" or "users/me")
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws {APIError} When request fails or token is missing
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get auth token
  const token = getAuthToken()
  
  if (!token) {
    throw new APIError('Authentication token not found. Please log in.', 401)
  }
  
  // Resolve backend URL
  const baseURL = getBackendURL()
  
  // Normalize endpoint (remove leading slash if present)
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const url = `${baseURL}/${normalizedEndpoint}`
  
  // Prepare headers
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type')
    const isJSON = contentType?.includes('application/json')
    
    // Parse response
    const data = isJSON ? await response.json() : await response.text()
    
    // Handle error responses
    if (!response.ok) {
      const message = typeof data === 'object' && data.message 
        ? data.message 
        : typeof data === 'string' 
        ? data 
        : `Request failed with status ${response.status}`
      
      throw new APIError(message, response.status, data)
    }
    
    return data
  } catch (error) {
    // Re-throw APIErrors
    if (error instanceof APIError) {
      throw error
    }
    
    // Network or parsing errors
    if (error instanceof Error) {
      throw new APIError(
        `Network error: ${error.message}`,
        undefined,
        error
      )
    }
    
    throw new APIError('Unknown error occurred')
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  /**
   * GET request
   */
  get: <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, { ...options, method: 'GET' })
  },
  
  /**
   * POST request
   */
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  
  /**
   * PUT request
   */
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  
  /**
   * PATCH request
   */
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  
  /**
   * DELETE request
   */
  delete: <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
  },
}

/**
 * Type definitions for common API responses
 */
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

/**
 * Example: Fetch current user profile
 */
export async function getCurrentUser(): Promise<User> {
  return api.get<User>('/users/me')
}

/**
 * Example: Fetch tenant-specific projects with pagination
 */
export async function getProjects(page = 1, pageSize = 20) {
  return api.get<PaginatedResponse<any>>(`/projects?page=${page}&pageSize=${pageSize}`)
}

/**
 * Example: Create a new resource
 */
export async function createProject(data: { name: string; description?: string }) {
  return api.post('/projects', data)
}

/**
 * Example: Update a resource
 */
export async function updateProject(id: string, data: Partial<{ name: string; description: string }>) {
  return api.patch(`/projects/${id}`, data)
}

/**
 * Example: Delete a resource
 */
export async function deleteProject(id: string) {
  return api.delete(`/projects/${id}`)
}
