/**
 * Headers required for multi-tenant Frappe routing.
 *
 * When ERP_NEXT_URL points at loopback (127.0.0.1:8080), Frappe's dns_multitenant
 * mode cannot infer the site from the URL host. X-Frappe-Site-Name alone is not
 * always enough — the HTTP Host header must match the tenant site (e.g.
 * testorg.avariq.in) or API token auth runs against the wrong site DB and returns
 * AuthenticationError even when keys are valid.
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
