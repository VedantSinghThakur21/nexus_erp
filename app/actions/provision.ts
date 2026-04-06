'use server'

import { cookies } from 'next/headers'
import { masterRequest } from '@/app/lib/api'
import { provisionTenantSite, ProvisioningError } from '@/lib/provisioning-client'

function buildProvisioningStatusUrl(subdomain: string): string {
  return `/provisioning-status?subdomain=${encodeURIComponent(subdomain)}`
}

function buildTenantSiteUrl(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  return process.env.NODE_ENV === 'production'
    ? `https://${subdomain}.${rootDomain}`
    : `http://${subdomain}.localhost:3000`
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
        source: 'email-signup',
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
    console.warn(`[Provision Action] Failed to mark tenant ${name} as ${status}:`, error)
  }
}

/**
 * Provision Server Action (Step 2 of 2)
 * 
 * Called from the /provisioning page. Reads pending signup data from cookie,
 * creates a Pending SaaS Tenant record, triggers the Python provisioning
 * service in the background, and returns the status-page redirect URL.
 * 
 * The action returns immediately so the browser can move to the status page
 * while the worker finishes site creation in the background.
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

  const siteUrl = buildTenantSiteUrl(data.subdomain)
  let tenantRecordName: string

  try {
    tenantRecordName = await createPendingTenantRecord({
      email: data.email,
      subdomain: data.subdomain,
      siteUrl,
    })
  } catch (error) {
    console.error('[Provision Action] Failed to create Pending tenant record:', error)
    return { success: false, error: 'Unable to register your workspace. Please try again.' }
  }

  try {
    void provisionTenantSite({
      organization_name: data.organizationName,
      admin_email: data.email,
      admin_password: data.password,
      admin_full_name: data.fullName,
      plan_type: data.plan as 'Free' | 'Pro' | 'Enterprise',
    })
      .then(async result => {
        if (!result.success) {
          console.error('[Provision Action] Service returned failure:', result.error)
          await markTenantStatus(tenantRecordName, 'Failed')
          return
        }

        console.log(`[Provision Action] ✓ Background job accepted for ${result.subdomain}`)
      })
      .catch(async error => {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        console.error('[Provision Action] Provisioning request failed:', message)
        await markTenantStatus(tenantRecordName, 'Failed')
      })

    // ── Clear pending signup cookie ──
    cookieStore.delete('pending_tenant_data')

    return {
      success: true,
      redirectUrl: buildProvisioningStatusUrl(data.subdomain),
      subdomain: data.subdomain,
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
