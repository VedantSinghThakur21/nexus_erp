'use server'

import { frappeRequest } from '../lib/api'

/**
 * Fix tenant site URL to include subdomain
 * This is needed for existing tenants that were provisioned with the old script
 */
export async function fixTenantSiteUrl(subdomain: string) {
  try {
    // Get the tenant
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: JSON.stringify({ subdomain }),
      fields: JSON.stringify(['name', 'site_url', 'subdomain']),
      limit_page_length: 1
    })

    if (!tenants || tenants.length === 0) {
      return {
        success: false,
        error: `Tenant with subdomain '${subdomain}' not found`
      }
    }

    const tenant = tenants[0]
    const newSiteUrl = `http://${subdomain}.localhost:8080`

    console.log('Updating tenant:', tenant.name)
    console.log('Old site_url:', tenant.site_url)
    console.log('New site_url:', newSiteUrl)

    // Update the site_url
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Tenant',
      name: tenant.name,
      fieldname: 'site_url',
      value: newSiteUrl
    })

    return {
      success: true,
      message: `Tenant site_url updated to ${newSiteUrl}`,
      oldUrl: tenant.site_url,
      newUrl: newSiteUrl
    }
  } catch (error: any) {
    console.error('Fix tenant URL error:', error)
    return {
      success: false,
      error: error.message || 'Failed to update tenant URL'
    }
  }
}

/**
 * Fix all tenants with incorrect site URLs
 */
export async function fixAllTenantUrls() {
  try {
    // Get all tenants
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      fields: JSON.stringify(['name', 'site_url', 'subdomain']),
      limit_page_length: 999
    })

    if (!tenants || tenants.length === 0) {
      return {
        success: true,
        message: 'No tenants found',
        fixed: 0
      }
    }

    let fixed = 0
    const results = []

    for (const tenant of tenants) {
      // Check if site_url needs fixing (doesn't include subdomain)
      if (tenant.site_url && !tenant.site_url.includes(tenant.subdomain)) {
        const newSiteUrl = `http://${tenant.subdomain}.localhost:8080`
        
        try {
          await frappeRequest('frappe.client.set_value', 'POST', {
            doctype: 'Tenant',
            name: tenant.name,
            fieldname: 'site_url',
            value: newSiteUrl
          })
          
          fixed++
          results.push({
            subdomain: tenant.subdomain,
            oldUrl: tenant.site_url,
            newUrl: newSiteUrl,
            success: true
          })
        } catch (error: any) {
          results.push({
            subdomain: tenant.subdomain,
            error: error.message,
            success: false
          })
        }
      }
    }

    return {
      success: true,
      message: `Fixed ${fixed} of ${tenants.length} tenants`,
      fixed,
      total: tenants.length,
      results
    }
  } catch (error: any) {
    console.error('Fix all tenant URLs error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fix tenant URLs'
    }
  }
}
