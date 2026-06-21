/**
 * Headers and base URLs for multi-tenant Frappe routing.
 *
 * Server-side ERP calls must use ERP_NEXT_URL (loopback / internal port), NOT the
 * tenant app subdomain (https://tenant.avariq.in) — that hostname serves Next.js
 * and middleware returns { code: "UNAUTHORIZED" } for /api/* without cookies.
 *
 * When frappe_docker uses FRAPPE_SITE_NAME_HEADER=$host, Frappe selects the site
 * from the HTTP Host header. Node fetch sets Host from the request URL hostname —
 * manual Host overrides are ignored — so loopback calls MUST use the site FQDN in
 * the URL (e.g. http://testorg.avariq.in:8080), not http://127.0.0.1:8080.
 *
 * On the app server, map tenant FQDNs to loopback (see fix-frappe-multitenancy.sh):
 *   127.0.0.1 erp.localhost testorg.avariq.in dabed.avariq.in
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
 * Rewrite a loopback ERP base URL to use the Frappe site FQDN as hostname.
 * Returns null when the base is not loopback or siteName is not a FQDN.
 */
export function frappeSiteScopedBaseUrl(siteName: string, configuredBase: string): string | null {
  if (!siteName.includes('.')) return null
  try {
    const url = new URL(configuredBase.replace(/\/+$/, ''))
    if (!isLoopbackFrappeBaseUrl(url.origin)) return null
    url.hostname = siteName
    return url.origin
  } catch {
    return null
  }
}

/**
 * Ordered Frappe base URLs to try for a target site.
 * Site-scoped loopback URLs first (correct Host for $host routing), then raw loopback fallbacks.
 */
export function frappeBaseUrlCandidates(siteName: string, configuredBase?: string): string[] {
  const urls: string[] = []
  const add = (raw?: string | null) => {
    if (!raw) return
    const normalized = raw.replace(/\/+$/, '')
    if (!urls.includes(normalized)) urls.push(normalized)
  }

  const rawBases = [
    process.env.ERP_FRAPPE_DIRECT_URL,
    configuredBase || process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080',
  ].filter(Boolean) as string[]

  for (const base of rawBases) {
    add(frappeSiteScopedBaseUrl(siteName, base))
    add(base)
  }

  return urls
}

/**
 * Base URL for server-side Frappe API calls (first candidate for the site).
 */
export function frappeEffectiveBaseUrl(siteName: string, configuredBase?: string): string {
  return frappeBaseUrlCandidates(siteName, configuredBase)[0]
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

  // When URL hostname already matches siteName, Host is correct. For legacy loopback
  // fallbacks, still attempt Host override (may work in some runtimes).
  try {
    const { hostname } = new URL(baseUrl)
    if (hostname !== siteName && siteName.includes('.') && isLoopbackFrappeBaseUrl(baseUrl)) {
      headers.Host = siteName
    }
  } catch {
    // ignore
  }

  return headers
}
