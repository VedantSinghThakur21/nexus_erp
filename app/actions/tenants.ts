'use server'

import { frappeRequest } from '../lib/api'

interface CreateTenantData {
  customer_name: string
  company_name: string
  subdomain: string
  owner_email: string
  owner_name: string
  plan: 'free' | 'pro' | 'enterprise'
}

interface CreateTenantResult {
  success: boolean
  tenant?: any
  error?: string
}

/**
 * Create a tenant record in the master ERPNext site
 * This creates an entry in the Tenant DocType on the master site
 * 
 * The Tenant DocType must exist on the master site first
 * Run: node scripts/setup-tenant-doctype.js
 */
export async function createTenant(data: CreateTenantData): Promise<CreateTenantResult> {
  try {
    console.log('Creating tenant record:', data.subdomain)
    
    // Validate required fields
    if (!data.subdomain || !data.owner_email || !data.company_name) {
      return {
        success: false,
        error: 'Missing required fields: subdomain, owner_email, company_name'
      }
    }
    
    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(data.subdomain)) {
      return {
        success: false,
        error: 'Invalid subdomain format. Only lowercase letters, numbers, and hyphens allowed.'
      }
    }
    
    // Check if tenant already exists
    try {
      const existing = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Tenant',
        filters: JSON.stringify({ subdomain: data.subdomain }),
        fields: JSON.stringify(['name', 'subdomain']),
        limit_page_length: 1
      })
      
      if (existing && existing.length > 0) {
        console.log('Tenant already exists:', data.subdomain)
        return {
          success: false,
          error: `Subdomain '${data.subdomain}' is already taken`
        }
      }
    } catch (checkError) {
      // If get_list fails, might be because DocType doesn't exist
      console.warn('Could not check existing tenants:', checkError)
      // Continue anyway and try to create
    }
    
    // Create tenant record in master site
    const tenant = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Tenant',
        subdomain: data.subdomain,
        customer_name: data.customer_name,
        company_name: data.company_name,
        organization_name: data.company_name, // Alias
        owner_email: data.owner_email,
        owner_name: data.owner_name,
        email: data.owner_email, // Alias for backward compatibility
        plan: data.plan,
        status: 'pending', // Will be updated to active after provisioning (must be lowercase)
        site_url: `http://${data.subdomain}.localhost:8080`,
        site_name: `${data.subdomain}.localhost`,
        created_at: new Date().toISOString()
      }
    })
    
    if (!tenant) {
      throw new Error('Failed to create tenant - no response from ERPNext')
    }
    
    console.log('✅ Tenant record created:', tenant.name || data.subdomain)
    
    return {
      success: true,
      tenant: {
        id: tenant.name,
        name: tenant.name,
        subdomain: data.subdomain,
        customer_name: data.customer_name,
        company_name: data.company_name,
        owner_email: data.owner_email,
        owner_name: data.owner_name,
        plan: data.plan,
        status: 'pending',
        site_url: `http://${data.subdomain}.localhost:8080`,
        site_name: `${data.subdomain}.localhost`
      }
    }
    
  } catch (error: any) {
    console.error('Failed to create tenant record:', error)
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Unknown error creating tenant'
    
    if (errorMessage.includes('Tenant DocType not found') || 
        errorMessage.includes('DocType: Tenant')) {
      errorMessage = 'Tenant DocType does not exist in ERPNext. Please run: node scripts/setup-tenant-doctype.js'
    } else if (errorMessage.includes('already exists')) {
      errorMessage = `Subdomain '${data.subdomain}' is already taken`
    } else if (errorMessage.includes('permission')) {
      errorMessage = 'Insufficient permissions to create tenant. Check ERPNext user permissions.'
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Update tenant record with provisioning results
 * This updates the tenant record with API credentials and status after provisioning
 */
export async function updateTenantAfterProvisioning(
  tenantId: string,
  siteConfig: {
    api_key: string
    api_secret: string
    site_url: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Updating tenant with provisioning results:', tenantId)
    
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Tenant',
      name: tenantId,
      fieldname: {
        site_config: JSON.stringify(siteConfig),
        status: 'active',
        provisioned_at: new Date().toISOString()
      }
    })
    
    console.log('✅ Tenant updated successfully')
    
    return { success: true }
    
  } catch (error: any) {
    console.error('Failed to update tenant:', error)
    return {
      success: false,
      error: error.message || 'Failed to update tenant record'
    }
  }
}

/**
 * Get tenant by subdomain
 */
export async function getTenant(subdomain: string): Promise<any> {
  try {
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: JSON.stringify({ subdomain }),
      fields: JSON.stringify(['*']),
      limit_page_length: 1
    })
    
    return tenants && tenants.length > 0 ? tenants[0] : null
  } catch (error) {
    console.error('Failed to get tenant:', error)
    return null
  }
}
