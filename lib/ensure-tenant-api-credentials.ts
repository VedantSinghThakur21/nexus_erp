import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { generateUserApiKeys } from '@/lib/provisioning-client'
import { verifyTenantApiToken } from '@/lib/verify-tenant-api-token'

function tenantSiteName(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  return process.env.NODE_ENV === 'production'
    ? `${subdomain}.${rootDomain}`
    : `${subdomain}.localhost`
}

function tenantApiCookieOptions() {
  const cookieDomain =
    process.env.NODE_ENV === 'production'
      ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
      : undefined
  const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  const cookieSecure = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite as 'lax' | 'none',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  }
}

/**
 * Ensure httpOnly tenant API key cookies exist before server-side Frappe calls.
 * Without keys, requests fall back to the sid cookie and Guest cannot call
 * frappe.client.get_list (not whitelisted).
 */
export async function ensureTenantApiCredentials(): Promise<void> {
  const cookieStore = await cookies()
  const existingKey = cookieStore.get('tenant_api_key')?.value?.trim()
  const existingSecret = cookieStore.get('tenant_api_secret')?.value?.trim()
  if (existingKey && existingSecret) return

  const session = await auth()
  const subdomain =
    cookieStore.get('tenant_subdomain')?.value?.trim().toLowerCase() ||
    session?.tenantSubdomain?.trim().toLowerCase()
  const userEmail =
    cookieStore.get('user_email')?.value?.trim() ||
    cookieStore.get('user_id')?.value?.trim() ||
    session?.user?.email?.trim()

  if (!subdomain || !userEmail) return

  const siteName = tenantSiteName(subdomain)
  const baseUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'

  try {
    const keys = await generateUserApiKeys(subdomain, userEmail, 30_000)
    const valid = await verifyTenantApiToken(
      siteName,
      keys.api_key,
      keys.api_secret,
      userEmail,
      { baseUrl },
    )
    if (!valid) return

    const cookieOpts = tenantApiCookieOptions()
    cookieStore.set('tenant_api_key', keys.api_key, cookieOpts)
    cookieStore.set('tenant_api_secret', keys.api_secret, cookieOpts)
    cookieStore.set('tenant_subdomain', subdomain, cookieOpts)
    cookieStore.set('user_email', userEmail, cookieOpts)
  } catch (error) {
    console.warn('[ensureTenantApiCredentials] Failed to mint tenant API keys:', error)
  }
}
