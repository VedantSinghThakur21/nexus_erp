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
 * Ordered Frappe base URLs to try (direct/gunicorn first, then nginx front door).
 * Port 8080 in frappe_docker often strips Authorization; :8000 gunicorn does not.
 */
export function frappeBaseUrlCandidates(configuredBase?: string): string[] {
  const urls: string[] = []
  const add = (raw?: string) => {
    if (!raw) return
    const normalized = raw.replace(/\/+$/, '')
    if (!urls.includes(normalized)) urls.push(normalized)
  }
  add(process.env.ERP_FRAPPE_DIRECT_URL)
  add(configuredBase || process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080')
  return urls
}

/**
 * Base URL for server-side Frappe API calls (first candidate).
 */
export function frappeEffectiveBaseUrl(_siteName: string, configuredBase?: string): string {
  return frappeBaseUrlCandidates(configuredBase)[0]
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
