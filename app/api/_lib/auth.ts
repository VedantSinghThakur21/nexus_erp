import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Verify that the request comes from an authenticated user.
 * Checks for tenant API credentials or session cookie.
 * Returns the user email if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<
  { authenticated: true; userEmail: string } |
  { authenticated: false; response: NextResponse }
> {
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
  const hasApiKey = cookieStore.get('tenant_api_key')?.value
  const hasSid = cookieStore.get('sid')?.value
  const hasSession = cookieStore.get('next-auth.session-token')?.value ||
    cookieStore.get('__Secure-next-auth.session-token')?.value

  if (!userEmail || (!hasApiKey && !hasSid && !hasSession)) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  return { authenticated: true, userEmail }
}
