'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { provisionTenantSite, checkSubdomain, ProvisioningError } from '@/lib/provisioning-client'
import { masterRequest } from '@/app/lib/api'
import crypto from 'crypto'

/**
 * Social (Google) Onboarding — Complete Workspace Setup
 * ======================================================
 * 
 * FLOW:
 * 1. User clicks "Sign in with Google" → NextAuth handles OAuth
 * 2. Google returns { email, name } → NextAuth creates session
 * 3. auth.ts signIn callback → checks if user has a tenant in Master DB
 *    - YES: redirect to `subdomain.avariq.in/dashboard`
 *    - NO:  redirect to `/onboarding` 
 * 4. /onboarding page → asks for Organization Name → calls this function
 * 5. This function provisions the site → redirects to new subdomain
 * 
 * WHY THIS IS SEPARATE FROM REGULAR SIGNUP:
 * - Google users don't provide a password on signup (we generate one)
 * - Google users already have verified email (no need for email verification)
 * - The auth token (NextAuth session) is already valid across subdomains
 *   (cookie domain is `.avariq.in`)
 */
export async function completeSocialOnboarding(data: {
  email: string
  name: string
  organizationName: string
}): Promise<{
  success: boolean
  redirectUrl?: string
  error?: string
}> {
  console.log(`[SocialOnboarding] Starting for ${data.email}, org="${data.organizationName}"`)

  // ── Validate Org Name ──
  if (!data.organizationName || data.organizationName.length < 3) {
    return { success: false, error: 'Organization name must be at least 3 characters' }
  }

  // ── Check Subdomain Availability ──
  const subdomain = data.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  try {
    const check = await checkSubdomain(subdomain)
    if (!check.available) {
      return { success: false, error: `"${subdomain}" is already taken. Choose a different organization name.` }
    }
  } catch (error) {
    console.error('[SocialOnboarding] Subdomain check failed:', error)
    // Continue anyway — the provisioning service will catch duplicates
  }

  // ── Check if User Already Has a Tenant ──
  try {
    const existing = await masterRequest('frappe.client.get_list', 'GET', {
      doctype: 'SaaS Tenant',
      filters: JSON.stringify({ owner_email: data.email }),
      fields: JSON.stringify(['subdomain', 'site_url']),
      limit_page_length: 1,
    }) as any[]

    if (existing && existing.length > 0) {
      const existingTenant = existing[0]
      console.log(`[SocialOnboarding] User already has tenant: ${existingTenant.subdomain}`)
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? `https://${existingTenant.subdomain}.${rootDomain}/dashboard`
        : `http://${existingTenant.subdomain}.localhost:3000/dashboard`
      return { success: true, redirectUrl }
    }
  } catch (error) {
    console.warn('[SocialOnboarding] Tenant existence check failed:', error)
  }

  // ── Provision the Tenant via Provisioning Service ──
  const generatedPassword = crypto.randomBytes(20).toString('base64url')

  try {
    const result = await provisionTenantSite({
      organization_name: data.organizationName,
      admin_email: data.email,
      admin_password: generatedPassword,
      admin_full_name: data.name,
      plan_type: 'Free',
    })

    if (!result.success) {
      console.error('[SocialOnboarding] Provisioning failed:', result.error)
      return { success: false, error: result.error || 'Workspace creation failed' }
    }

    console.log(`[SocialOnboarding] ✓ Provisioned: ${result.site_name}`)
    console.log(`[SocialOnboarding]   Steps: ${result.steps_completed?.join(', ')}`)

    // ── Store API credentials for the new tenant ──
    if (result.api_key && result.api_secret) {
      const cookieStore = await cookies()
      const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        domain: process.env.NODE_ENV === 'production'
          ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
          : undefined,
      }
      cookieStore.set('tenant_api_key', result.api_key, cookieOpts)
      cookieStore.set('tenant_api_secret', result.api_secret, cookieOpts)
      cookieStore.set('tenant_subdomain', result.subdomain || '', cookieOpts)
    }

    // ── Build Redirect URL ──
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? `https://${result.subdomain}.${rootDomain}/dashboard`
      : `http://${result.subdomain}.localhost:3000/dashboard`

    return { success: true, redirectUrl }

  } catch (error) {
    if (error instanceof ProvisioningError) {
      console.error(`[SocialOnboarding] ProvisioningError: ${error.message}`)
      if (error.status === 503) {
        return { success: false, error: 'Service temporarily unavailable. Please try again.' }
      }
      return { success: false, error: error.message }
    }

    console.error('[SocialOnboarding] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Check if a Google user already has a tenant.
 * Called from auth.ts signIn callback or from middleware.
 */
export async function lookupTenantByEmail(email: string): Promise<{
  hasTenant: boolean
  subdomain?: string
  siteUrl?: string
}> {
  try {
    const result = await masterRequest('frappe.client.get_list', 'GET', {
      doctype: 'SaaS Tenant',
      filters: JSON.stringify({ owner_email: email, status: 'Active' }),
      fields: JSON.stringify(['subdomain', 'site_url']),
      limit_page_length: 1,
    }) as any[]

    if (result && result.length > 0) {
      return {
        hasTenant: true,
        subdomain: result[0].subdomain,
        siteUrl: result[0].site_url,
      }
    }
    return { hasTenant: false }
  } catch {
    return { hasTenant: false }
  }
}
