import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { generateUserApiKeys } from '@/lib/provisioning-client'

/**
 * Sync tenant API key cookies with the canonical values stored on the Frappe User doc.
 * Safe to call after deploys or when cookies drift from the backend.
 */
export async function POST() {
  const cookieStore = await cookies()
  const subdomain = cookieStore.get('tenant_subdomain')?.value
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

  if (!subdomain || !userEmail) {
    return NextResponse.json({ error: 'Not authenticated as a tenant user' }, { status: 401 })
  }

  try {
    const keys = await generateUserApiKeys(subdomain, userEmail, 30_000)
    const cookieDomain =
      process.env.NODE_ENV === 'production'
        ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
        : undefined
    const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    const cookieSecure = process.env.NODE_ENV === 'production'

    cookieStore.set('tenant_api_key', keys.api_key, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
    cookieStore.set('tenant_api_secret', keys.api_secret, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh tenant API keys'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
