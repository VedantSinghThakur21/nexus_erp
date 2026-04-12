'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logoutUser() {
  const cookieStore = await cookies()

  const cookieDomain = process.env.NODE_ENV === 'production'
    ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}` : undefined

  // Provide exactly the same options used during creation to ensure deletion works across subdomains
  const deleteOpts = { domain: cookieDomain, path: '/' }

  // Delete all session cookies
  cookieStore.delete({ name: 'sid', ...deleteOpts })
  cookieStore.delete({ name: 'user_id', ...deleteOpts })
  cookieStore.delete({ name: 'user_email', ...deleteOpts })
  cookieStore.delete({ name: 'full_name', ...deleteOpts })
  cookieStore.delete({ name: 'system_user', ...deleteOpts })
  cookieStore.delete({ name: 'access_token', ...deleteOpts })
  cookieStore.delete({ name: 'refresh_token', ...deleteOpts })
  cookieStore.delete({ name: 'tenant_api_key', ...deleteOpts })
  cookieStore.delete({ name: 'tenant_api_secret', ...deleteOpts })

  // NextAuth cookies
  cookieStore.delete({ name: 'next-auth.session-token', ...deleteOpts })
  cookieStore.delete({ name: '__Secure-next-auth.session-token', ...deleteOpts })
  cookieStore.delete({ name: 'next-auth.callback-url', ...deleteOpts })
  cookieStore.delete({ name: '__Secure-next-auth.callback-url', ...deleteOpts })
  cookieStore.delete({ name: 'next-auth.csrf-token', ...deleteOpts })
  cookieStore.delete({ name: '__Host-next-auth.csrf-token', ...deleteOpts })

  // Redirect to login page
  redirect('/login')
}
