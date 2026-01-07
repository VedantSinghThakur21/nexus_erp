'use server'

import { frappeRequest } from '../lib/api'
import type { Tenant, TenantCreateRequest, TenantProvisioningResult } from '@/types/tenant'

/**
 * Create a new tenant in the master database
 * This doesn't provision the site yet - see provisionTenant()
 */
export async function createTenant(data: TenantCreateRequest): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  try {
    // Validate subdomain
    if (!/^[a-z0-9-]+$/.test(data.subdomain)) {
      return {
        success: false,
        error: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
      }
    }

    // Check if subdomain is already taken
    const existing = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: { subdomain: data.subdomain },
      limit_page_length: 1
    })

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: 'Subdomain is already taken'
      }
    }

    // Create tenant record
    console.log('Creating tenant with data:', {
      customer_name: data.customer_name,
      company_name: data.company_name,
      subdomain: data.subdomain,
      owner_email: data.owner_email,
      admin_email: data.admin_email || data.owner_email, // Add admin_email for login lookup
      plan: data.plan
    })
    
    const tenant = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Tenant',
        customer_name: data.customer_name,
        company_name: data.company_name,
        subdomain: data.subdomain,
        owner_email: data.owner_email,
        owner_name: data.owner_name,
        admin_email: data.admin_email || data.owner_email, // Admin email for authentication
        plan: data.plan,
        status: 'pending',
        site_url: `https://${data.subdomain}.nexuserp.com`,
        erpnext_site: `${data.subdomain}.localhost`,
        created_at: new Date().toISOString()
      }
    })

    console.log('Tenant created response:', tenant)

    // Handle different response structures
    const tenantData = tenant?.data || tenant?.message || tenant
    
    if (!tenantData) {
      throw new Error('Invalid response from server')
    }

    return {
      success: true,
      tenant: tenantData as Tenant
    }
  } catch (error: any) {
    console.error('Create tenant error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response
    })
    return {
      success: false,
      error: error.message || 'Failed to create tenant'
    }
  }
}

/**
 * Get tenant by subdomain
 */
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  try {
    const result = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: { subdomain },
      limit_page_length: 1,
      fields: ['*']
    })

    if (result && result.length > 0) {
      return result[0] as Tenant
    }

    return null
  } catch (error) {
    console.error('Get tenant error:', error)
    return null
  }
}

/**
 * Get all tenants (admin only)
 */
export async function getAllTenants(): Promise<Tenant[]> {
  try {
    const result = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      fields: ['*'],
      limit_page_length: 0
    })

    return result || []
  } catch (error) {
    console.error('Get all tenants error:', error)
    return []
  }
}

/**
 * Update tenant status
 */
export async function updateTenantStatus(
  tenantId: string,
  status: 'active' | 'suspended' | 'trial' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Tenant',
      name: tenantId,
      fieldname: 'status',
      value: status
    })

    return { success: true }
  } catch (error: any) {
    console.error('Update tenant status error:', error)
    return {
      success: false,
      error: error.message || 'Failed to update tenant status'
    }
  }
}

/**
 * Update tenant plan (upgrade/downgrade)
 */
export async function updateTenantPlan(
  tenantId: string,
  plan: 'free' | 'pro' | 'enterprise'
): Promise<{ success: boolean; error?: string }> {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Tenant',
      name: tenantId,
      fieldname: 'plan',
      value: plan
    })

    return { success: true }
  } catch (error: any) {
    console.error('Update tenant plan error:', error)
    return {
      success: false,
      error: error.message || 'Failed to update tenant plan'
    }
  }
}
