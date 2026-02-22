'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Clear tenant API session cookies and redirect to login.
 * Called automatically when TENANT_CREDENTIALS_MISSING is detected.
 */
export async function clearTenantSession() {
    const cookieStore = await cookies()

    cookieStore.delete('tenant_api_key')
    cookieStore.delete('tenant_api_secret')
    cookieStore.delete('sid')
    cookieStore.delete('user_id')
    cookieStore.delete('user_email')
    cookieStore.delete('full_name')
    cookieStore.delete('system_user')
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')
    cookieStore.delete('next-auth.session-token')
    cookieStore.delete('__Secure-next-auth.session-token')

    redirect('/login?reason=session_expired')
}
