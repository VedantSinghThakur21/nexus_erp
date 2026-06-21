import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateUserApiKeys } from '@/lib/provisioning-client'
import { verifyTenantApiToken } from '@/lib/verify-tenant-api-token'

function tenantSiteName(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  return process.env.NODE_ENV === 'production'
    ? `${subdomain}.${rootDomain}`
    : `${subdomain}.localhost`
}

/**
 * Sync tenant API key cookies with the canonical values stored on the Frappe User doc.
 * Safe to call after deploys or when cookies drift from the backend.
 * Falls back to NextAuth session for subdomain/email when credential cookies are missing
 * (Google OAuth path).
 */
export async function POST() {
  const cookieStore = await cookies()
  const session = await auth()

  const subdomain =
    cookieStore.get('tenant_subdomain')?.value ||
    session?.tenantSubdomain ||
    undefined
  const userEmail =
    cookieStore.get('user_email')?.value ||
    cookieStore.get('user_id')?.value ||
    session?.user?.email ||
    undefined

  if (!subdomain || !userEmail) {
    return NextResponse.json({ error: 'Not authenticated as a tenant user' }, { status: 401 })
  }

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
    if (!valid) {
      return NextResponse.json(
        { error: `API keys failed verification on ${siteName}` },
        { status: 502 },
      )
    }

    const cookieDomain =
      process.env.NODE_ENV === 'production'
        ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
        : undefined
    const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    const cookieSecure = process.env.NODE_ENV === 'production'
    const cookieOpts = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite as 'lax' | 'none',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    }

    cookieStore.set('tenant_api_key', keys.api_key, cookieOpts)
    cookieStore.set('tenant_api_secret', keys.api_secret, cookieOpts)
    cookieStore.set('tenant_subdomain', subdomain, cookieOpts)
    cookieStore.set('user_email', userEmail, cookieOpts)

    return NextResponse.json({ success: true, siteName })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh tenant API keys'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
