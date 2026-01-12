import { headers } from 'next/headers'
import { cache } from 'react'

/**
 * Get current tenant identifier
 * Works in:
 * - Server Components (reads from headers injected by middleware)
 * - Server Actions
 * - Route Handlers
 * 
 * @returns tenant identifier (e.g., "tenant1", "tenant2", "default")
 */
export const getTenant = cache(async (): Promise<string> => {
  const headersList = await headers()
  const tenant = headersList.get('x-tenant')
  
  if (!tenant) {
    console.warn('Tenant header not found. Middleware may not be configured correctly.')
    return 'default'
  }
  
  return tenant
})

/**
 * Client-side hook to get tenant from hostname
 * Use this in Client Components
 * 
 * @returns tenant identifier
 */
export function useClientTenant(): string {
  if (typeof window === 'undefined') {
    return 'default'
  }
  
  const hostname = window.location.hostname
  return extractTenantFromHostname(hostname)
}

/**
 * Extracts tenant identifier from hostname
 * Supports:
 * - tenant1.localhost -> "tenant1"
 * - tenant2.example.com -> "tenant2"
 * - localhost -> "default"
 * - example.com -> "default"
 */
function extractTenantFromHostname(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Split by dots
  const parts = host.split('.')
  
  // If it's a subdomain (more than 2 parts, or localhost with subdomain)
  if (parts.length >= 2) {
    // Check if it's subdomain.localhost
    if (parts[parts.length - 1] === 'localhost' && parts.length > 1) {
      return parts[0] // Return subdomain
    }
    // Check if it's subdomain.domain.com
    if (parts.length > 2) {
      return parts[0] // Return subdomain
    }
  }
  
  // Default tenant for localhost or apex domain
  return 'default'
}

/**
 * Type-safe tenant context for TypeScript
 */
export type TenantContext = {
  tenant: string
  isDefault: boolean
}

/**
 * Get enhanced tenant context with additional metadata
 * Server-side only
 */
export async function getTenantContext(): Promise<TenantContext> {
  const tenant = await getTenant()
  
  return {
    tenant,
    isDefault: tenant === 'default',
  }
}
