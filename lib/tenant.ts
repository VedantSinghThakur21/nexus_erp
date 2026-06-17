import { headers } from 'next/headers'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

/**
 * Parse tenant subdomain from Host / X-Forwarded-Host (same rules as proxy.ts).
 */
export function parseTenantSubdomainFromHost(host: string): string | null {
  const hostname = host.split(':')[0].toLowerCase()

  if (hostname.includes('localhost')) {
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
      return parts[0] || null
    }
    return null
  }

  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return null
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1))
    return sub && sub !== 'www' ? sub : null
  }

  return null
}

/**
 * Resolve tenant id from middleware header, falling back to the request Host.
 */
export async function resolveTenantId(): Promise<string> {
  const headersList = await headers()
  const fromMiddleware = headersList.get('x-tenant-id')
  if (fromMiddleware && fromMiddleware !== 'master') {
    return fromMiddleware
  }

  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const fromHost = parseTenantSubdomainFromHost(host)
  if (fromHost) return fromHost

  return fromMiddleware || 'master'
}

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
  return resolveTenantId()
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
