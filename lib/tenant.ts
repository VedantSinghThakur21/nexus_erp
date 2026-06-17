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
/**
 * Build a minimal SaaS Tenant record from subdomain when master DB lookup is unavailable.
 * Used for tenant-subdomain logins (middleware already validated the host).
 */
export function buildTenantFromSubdomain(subdomain: string): {
  name: string
  subdomain: string
  site_url: string
  status: string
} {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  const isProduction = process.env.NODE_ENV === 'production'
  const siteUrl = isProduction
    ? `https://${subdomain}.${rootDomain}`
    : `http://${subdomain}.localhost:8080`

  return {
    name: subdomain,
    subdomain,
    site_url: siteUrl,
    status: 'Active',
  }
}

export async function getTenantContext(): Promise<TenantContext> {
  const tenant = await getTenant()

  return {
    tenant,
    isMaster: tenant === 'master',
  }
}
