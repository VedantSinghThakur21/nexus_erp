'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { masterRequest } from '@/app/lib/api'

export async function initiateSignup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const organizationName = formData.get('organizationName') as string
  const plan = formData.get('plan') as string || 'Free'

  if (!email || !password || !organizationName) {
    return { success: false, error: 'Missing required fields' }
  }

  // 1. Generate Subdomain from Org Name
  const subdomain = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // 2. Check Availability in Master DB
  try {
    const existing = await masterRequest('frappe.client.get_value', 'GET', {
      doctype: 'SaaS Tenant',
      fieldname: 'name',
      filters: { subdomain: subdomain }
    }) as any

    if (existing && existing.name) {
      return { success: false, error: `The subdomain "${subdomain}" is already taken. Please choose a different organization name.` }
    }
  } catch (error) {
    console.error("Availability Check Failed:", error)
    // Proceed with caution or fail? Let's fail safe.
    return { success: false, error: 'Unable to verify availability. Please try again.' }
  }

  // 3. Store Data in Secure Cookie
  // We need this data on the /provisioning page to actually run the script
  const signupData = {
    email,
    password,
    fullName,
    organizationName,
    subdomain,
    plan
  }

  const cookieStore = await cookies()
  const oneHour = 60 * 60 * 1000

  cookieStore.set('pending_tenant_data', JSON.stringify(signupData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: oneHour,
    path: '/'
  })

  // 4. Redirect to Provisioning Page
  redirect('/provisioning')
}
