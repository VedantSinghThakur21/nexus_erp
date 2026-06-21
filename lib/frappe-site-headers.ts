/**
 * Headers required for multi-tenant Frappe routing.
 *
 * Server-side ERP calls must use ERP_NEXT_URL (loopback / internal port), NOT the
 * tenant app subdomain (https://tenant.avariq.in) — that hostname serves Next.js
 * and middleware returns { code: "UNAUTHORIZED" } for /api/* without cookies.
 *
 * When ERP_NEXT_URL is loopback, set Host to the Frappe site name so dns_multitenant
 * connects to the correct site DB before token auth runs.
 */
export function isLoopbackFrappeBaseUrl(baseUrl: string): boolean {
  try {
    const { hostname } = new URL(baseUrl)
    return (
      hostname === '127.0.0.1' ||
      hostname === 'localhost' ||
      hostname === 'host.docker.internal' ||
      hostname === '::1'
    )
  } catch {
    return false
  }
}

/**
 * Base URL for server-side Frappe API calls.
 * Never use the tenant Next.js subdomain — use ERP_NEXT_URL or ERP_FRAPPE_DIRECT_URL.
 */
export function frappeEffectiveBaseUrl(_siteName: string, configuredBase?: string): string {
  const direct = process.env.ERP_FRAPPE_DIRECT_URL?.replace(/\/+$/, '')
  if (direct) return direct
  return configuredBase || process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
}

export function frappeSiteRequestHeaders(
  siteName: string,
  baseUrl: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    ...extra,
    'X-Frappe-Site-Name': siteName,
  }

  if (siteName.includes('.') && isLoopbackFrappeBaseUrl(baseUrl)) {
    headers.Host = siteName
  }

  return headers
}
