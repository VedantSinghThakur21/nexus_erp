import { frappeBaseUrlCandidates, frappeSiteRequestHeaders } from '@/lib/frappe-site-headers'

/**
 * Verify tenant user API keys against Frappe the same way server-side ERP calls do.
 */
export async function verifyTenantApiToken(
  siteName: string,
  apiKey: string,
  apiSecret: string,
  expectedEmail: string,
  options: { baseUrl?: string; timeoutMs?: number } = {}
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 15_000

  for (const baseUrl of frappeBaseUrlCandidates(options.baseUrl)) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${baseUrl}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        headers: frappeSiteRequestHeaders(siteName, baseUrl, {
          Accept: 'application/json',
          Authorization: `token ${apiKey}:${apiSecret}`,
        }),
        signal: controller.signal,
        cache: 'no-store',
      })

      if (!response.ok) continue

      const data = (await response.json()) as { message?: string }
      if (data.message === expectedEmail) return true
    } catch {
      // try next base URL
    } finally {
      clearTimeout(timer)
    }
  }

  return false
}
