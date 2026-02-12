import { headers } from 'next/headers'

/**
 * Get current tenant identifier from x-tenant-id header
 * Server-side only (uses next/headers)
 * 
 * Works in:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 * 
 * @returns tenant identifier (e.g., "tesla", "master")
 */
export async function getTenant(): Promise<string> {
  const headersList = await headers()
  const tenant = headersList.get('x-tenant-id')

  if (!tenant) {
    console.warn('[getTenant] Tenant header not found. Middleware may not be configured correctly.')
    return 'master'
  }

  return tenant
}

/**
 * Type-safe tenant context for TypeScript
 */
export type TenantContext = {
  tenant: string
  isMaster: boolean
}

/**
 * Get enhanced tenant context with additional metadata
 * Server-side only
 */
export async function getTenantContext(): Promise<TenantContext> {
  const tenant = await getTenant()

  return {
    tenant,
    isMaster: tenant === 'master',
  }
}
