'use server'

import { cookies } from 'next/headers'
import { provisionTenantSite, ProvisioningError } from '@/lib/provisioning-client'

/**
 * Provision Server Action (Step 2 of 2)
 * 
 * Called from the /provisioning page. Reads pending signup data from cookie,
 * calls the Python provisioning service, and returns the redirect URL.
 * 
 * THE KEY IMPROVEMENT:
 * - No more `docker exec` or `bench console` shell hacks
 * - Clean HTTP call to the Python provisioning service
 * - Proper error handling with typed errors
 * - API keys returned from provisioning are stored for immediate login
 */
export async function performProvisioning(): Promise<{
  success: boolean
  redirectUrl?: string
  subdomain?: string
  error?: string
}> {
  const cookieStore = await cookies()
  const pending = cookieStore.get('pending_tenant_data')?.value

  if (!pending) {
    return { success: false, error: 'No pending signup found. Please restart the signup process.' }
  }

  let data: {
    email: string
    password: string
    fullName: string
    organizationName: string
    subdomain: string
    plan: string
  }

  try {
    data = JSON.parse(pending)
  } catch {
    return { success: false, error: 'Invalid signup data. Please restart.' }
  }

  console.log(`[Provision Action] Starting for org="${data.organizationName}" email="${data.email}"`)

  try {
    // ── Call the Provisioning Service (Python FastAPI) ──
    const result = await provisionTenantSite({
      organization_name: data.organizationName,
      admin_email: data.email,
      admin_password: data.password,
      admin_full_name: data.fullName,
      plan_type: data.plan as 'Free' | 'Pro' | 'Enterprise',
    })

    if (!result.success) {
      console.error('[Provision Action] Service returned failure:', result.error)
      return { success: false, error: result.error || 'Provisioning failed' }
    }

    console.log(`[Provision Action] ✓ Success. Steps: ${result.steps_completed?.join(', ')}`)

    // ── Store tenant API credentials in cookies for immediate use ──
    if (result.api_key && result.api_secret) {
      cookieStore.set('tenant_api_key', result.api_key, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        domain: process.env.NODE_ENV === 'production'
          ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
          : undefined,
      })
      cookieStore.set('tenant_api_secret', result.api_secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        domain: process.env.NODE_ENV === 'production'
          ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
          : undefined,
      })
    }

    // ── Clear pending signup cookie ──
    cookieStore.delete('pending_tenant_data')

    // ── Build Redirect URL ──
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? `https://${result.subdomain}.${rootDomain}/dashboard`
      : `http://${result.subdomain}.localhost:3000/dashboard`

    return {
      success: true,
      redirectUrl,
      subdomain: result.subdomain,
    }

  } catch (error) {
    if (error instanceof ProvisioningError) {
      console.error(`[Provision Action] ProvisioningError (${error.status}):`, error.message)

      if (error.status === 503) {
        return { success: false, error: 'Provisioning service is unavailable. Please try again in a few minutes.' }
      }
      if (error.status === 504) {
        return { success: false, error: 'Provisioning is taking longer than expected. Please wait and check your email.' }
      }

      return { success: false, error: error.message }
    }

    console.error('[Provision Action] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred during provisioning.' }
  }
}
