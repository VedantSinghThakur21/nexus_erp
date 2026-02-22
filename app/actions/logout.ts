'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logoutUser() {
  const cookieStore = await cookies()

  // Delete all session cookies
  cookieStore.delete('sid')
  cookieStore.delete('user_id')
  cookieStore.delete('user_email')
  cookieStore.delete('full_name')
  cookieStore.delete('system_user')
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  cookieStore.delete('tenant_api_key')
  cookieStore.delete('tenant_api_secret')

  // NextAuth cookies
  cookieStore.delete('next-auth.session-token')
  cookieStore.delete('__Secure-next-auth.session-token')
  cookieStore.delete('next-auth.callback-url')
  cookieStore.delete('__Secure-next-auth.callback-url')
  cookieStore.delete('next-auth.csrf-token')
  cookieStore.delete('__Host-next-auth.csrf-token')

  // Redirect to login page
  redirect('/login')
}
