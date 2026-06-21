/**
 * Headers required for multi-tenant Frappe routing.
 *
 * When ERP_NEXT_URL points at loopback (127.0.0.1:8080), Frappe's dns_multitenant
 * mode cannot infer the site from the URL host. Prefer frappeEffectiveBaseUrl()
 * so requests hit the tenant vhost (https://tenant.domain) instead of loopback.
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
 * Resolve the Frappe base URL for a site.
 * Tenant sites on production should use their FQDN (nginx vhost) rather than
 * loopback — port 8080 often strips or mishandles Authorization / site routing.
 */
export function frappeEffectiveBaseUrl(siteName: string, configuredBase?: string): string {
  const base = configuredBase || process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  if (!isLoopbackFrappeBaseUrl(base)) return base

  const masterSite = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
  if (siteName === masterSite) return base

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  if (rootDomain && siteName.endsWith(`.${rootDomain}`)) {
    const scheme =
      process.env.ERP_TENANT_FRAPPE_SCHEME ||
      (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    return `${scheme}://${siteName}`
  }

  if (siteName.endsWith('.localhost')) {
    return `http://${siteName}`
  }

  return base
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

  // Only needed when still calling loopback; FQDN URLs carry Host in the URL.
  if (siteName.includes('.') && isLoopbackFrappeBaseUrl(baseUrl)) {
    headers.Host = siteName
  }

  return headers
}
