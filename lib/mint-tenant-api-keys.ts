import { generateUserApiKeys } from '@/lib/provisioning-client'
import { frappeEffectiveBaseUrl, frappeSiteRequestHeaders } from '@/lib/frappe-site-headers'
import { verifyTenantApiToken } from '@/lib/verify-tenant-api-token'

export async function mintTenantApiKeysViaSession(
  siteName: string,
  userEmail: string,
  sessionId: string,
  baseUrl: string,
  timeoutMs = 20_000,
): Promise<{ apiKey: string; apiSecret: string } | null> {
  const frappeBaseUrl = frappeEffectiveBaseUrl(siteName, baseUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const genResponse = await fetch(
      `${frappeBaseUrl}/api/method/frappe.core.doctype.user.user.generate_keys`,
      {
        method: 'POST',
        headers: frappeSiteRequestHeaders(siteName, frappeBaseUrl, {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Cookie: `sid=${sessionId}`,
        }),
        body: JSON.stringify({ user: userEmail }),
        signal: controller.signal,
        cache: 'no-store',
      },
    )
    const genData = (await genResponse.json()) as {
      message?: string | { api_secret?: string; apiSecret?: string }
    }
    if (!genResponse.ok) return null

    let apiSecret: string | null = null
    const message = genData.message
    if (typeof message === 'string' && message) {
      apiSecret = message
    } else if (message && typeof message === 'object') {
      apiSecret =
        (typeof message.api_secret === 'string' && message.api_secret) ||
        (typeof message.apiSecret === 'string' && message.apiSecret) ||
        null
    }
    if (!apiSecret) return null

    const userResponse = await fetch(`${frappeBaseUrl}/api/method/frappe.client.get`, {
      method: 'POST',
      headers: frappeSiteRequestHeaders(siteName, frappeBaseUrl, {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: `sid=${sessionId}`,
      }),
      body: JSON.stringify({ doctype: 'User', name: userEmail }),
      signal: controller.signal,
      cache: 'no-store',
    })
    const userData = (await userResponse.json()) as { message?: { api_key?: string } }
    if (!userResponse.ok) return null

    const apiKey = userData.message?.api_key
    if (!apiKey) return null

    const valid = await verifyTenantApiToken(siteName, apiKey, apiSecret, userEmail, {
      baseUrl: frappeBaseUrl,
      timeoutMs,
    })
    if (!valid) return null

    return { apiKey, apiSecret }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function mintTenantApiKeysForLogin(options: {
  subdomain: string
  siteName: string
  userEmail: string
  sessionId?: string
  baseUrl: string
  fastLogin?: boolean
}): Promise<{ apiKey: string | null; apiSecret: string | null }> {
  const { subdomain, siteName, userEmail, sessionId, baseUrl, fastLogin } = options
  if (fastLogin || !userEmail) return { apiKey: null, apiSecret: null }

  const accept = async (apiKey: string, apiSecret: string) => {
    if (await verifyTenantApiToken(siteName, apiKey, apiSecret, userEmail, { baseUrl })) {
      return { apiKey, apiSecret }
    }
    return null
  }

  try {
    let provKeys = await generateUserApiKeys(subdomain, userEmail, 90_000)
    let accepted = await accept(provKeys.api_key, provKeys.api_secret)
    if (accepted) return accepted

    console.warn('[Login] Provisioning keys failed HTTP check — forcing rotate')
    provKeys = await generateUserApiKeys(subdomain, userEmail, 90_000, { forceRotate: true })
    accepted = await accept(provKeys.api_key, provKeys.api_secret)
    if (accepted) return accepted
  } catch (apiError: unknown) {
    const message = apiError instanceof Error ? apiError.message : String(apiError)
    console.warn('[Login] Provisioning key mint failed:', message)
  }

  if (sessionId) {
    const sessionKeys = await mintTenantApiKeysViaSession(siteName, userEmail, sessionId, baseUrl)
    if (sessionKeys) {
      console.warn('[Login] Minted API keys via Frappe session after provisioning failure')
      return sessionKeys
    }
  }

  console.warn('[Login] Could not mint valid API keys — dashboard will use session cookie auth')
  return { apiKey: null, apiSecret: null }
}
