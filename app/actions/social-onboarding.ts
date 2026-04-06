'use server'

import { provisionTenantSite, checkSubdomain, ProvisioningError } from '@/lib/provisioning-client'
import { masterRequest } from '@/app/lib/api'
import crypto from 'crypto'

function buildTenantDashboardUrl(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  return process.env.NODE_ENV === 'production'
    ? `https://${subdomain}.${rootDomain}/dashboard`
    : `http://${subdomain}.localhost:3000/dashboard`
}

function buildProvisioningStatusUrl(subdomain: string): string {
  const encodedSubdomain = encodeURIComponent(subdomain)
  return `/provisioning-status?subdomain=${encodedSubdomain}`
}

async function createPendingTenantRecord(input: {
  email: string
  subdomain: string
  siteUrl: string
}): Promise<string> {
  const result = await masterRequest('frappe.client.insert', 'POST', {
    doc: {
      doctype: 'SaaS Tenant',
      owner_email: input.email,
      subdomain: input.subdomain,
      site_url: input.siteUrl,
      status: 'Pending',
      site_config: JSON.stringify({
        created_at: new Date().toISOString(),
        provision_state: 'pending',
        source: 'social-onboarding',
      }),
    },
  }) as { name?: string }

  return result.name || input.subdomain
}

async function markTenantStatus(name: string, status: string): Promise<void> {
  try {
    await masterRequest('frappe.client.set_value', 'POST', {
      doctype: 'SaaS Tenant',
      name,
      fieldname: 'status',
      value: status,
    })
  } catch (error) {
    console.warn(`[SocialOnboarding] Failed to mark tenant ${name} as ${status}:`, error)
  }
}

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

  const siteUrl = process.env.NODE_ENV === 'production'
    ? `https://${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
    : `http://${subdomain}.localhost:3000`

  // ── Check if User Already Has a Tenant ──
  try {
    const existing = await masterRequest('frappe.client.get_list', 'GET', {
      doctype: 'SaaS Tenant',
      filters: JSON.stringify({ owner_email: data.email }),
      fields: JSON.stringify(['subdomain', 'site_url', 'status']),
      limit_page_length: 1,
    }) as any[]

    if (existing && existing.length > 0) {
      const existingTenant = existing[0]
      const tenantStatus = String(existingTenant.status || '').toLowerCase()
      const redirectUrl = tenantStatus === 'active'
        ? buildTenantDashboardUrl(existingTenant.subdomain)
        : buildProvisioningStatusUrl(existingTenant.subdomain)
      return { success: true, redirectUrl }
    }
  } catch (error) {
  }

  // ── Register the Pending Tenant in Master DB ──
  const generatedPassword = crypto.randomBytes(20).toString('base64url')
  const tenantRecordName = await createPendingTenantRecord({
    email: data.email,
    subdomain,
    siteUrl,
  })

  // ── Provision the Tenant via Provisioning Service ──
  try {
    void provisionTenantSite({
      organization_name: data.organizationName,
      admin_email: data.email,
      admin_password: generatedPassword,
      admin_full_name: data.name,
      plan_type: 'Free',
    })
      .then(async result => {
        if (!result.success) {
          console.error('[SocialOnboarding] Provisioning failed:', result.error)
          await markTenantStatus(tenantRecordName, 'Failed')
          return
        }

        console.log(`[SocialOnboarding] Provisioning completed for ${result.subdomain}`)
      })
      .catch(async error => {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        console.error('[SocialOnboarding] Provisioning request failed:', message)
        await markTenantStatus(tenantRecordName, 'Failed')
      })

    return {
      success: true,
      redirectUrl: buildProvisioningStatusUrl(subdomain),
    }

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
