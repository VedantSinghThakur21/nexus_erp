'use server'

import { frappeRequest } from '../lib/api'

interface CreateTenantUserParams {
  email: string
  fullName: string
  password: string
  subdomain: string
}

/**
 * Create a user in a tenant site
 * This is needed when a site was provisioned but the user wasn't created
 */
export async function createTenantUser(params: CreateTenantUserParams) {
  try {
    // Get tenant details
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: JSON.stringify({ subdomain: params.subdomain }),
      fields: JSON.stringify(['name', 'site_url', 'site_config', 'subdomain']),
      limit_page_length: 1
    })

    if (!tenants || tenants.length === 0) {
      return {
        success: false,
        error: `Tenant with subdomain '${params.subdomain}' not found`
      }
    }

    const tenant = tenants[0]
    const siteConfig = typeof tenant.site_config === 'string' 
      ? JSON.parse(tenant.site_config) 
      : tenant.site_config

    if (!siteConfig || !siteConfig.api_key || !siteConfig.api_secret) {
      return {
        success: false,
        error: 'Site config missing API credentials'
      }
    }

    const siteName = `${params.subdomain}.localhost`
    const siteUrl = tenant.site_url

    console.log('Creating user in tenant site:', {
      email: params.email,
      siteName,
      siteUrl
    })

    // Create user in tenant site
    const response = await fetch(`${siteUrl}/api/method/frappe.client.insert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${siteConfig.api_key}:${siteConfig.api_secret}`,
        'X-Frappe-Site-Name': siteName
      },
      body: JSON.stringify({
        doc: {
          doctype: 'User',
          email: params.email,
          first_name: params.fullName,
          new_password: params.password,
          send_welcome_email: 0,
          user_type: 'System User',
          enabled: 1
        }
      })
    })

    const result = await response.json()
    console.log('User creation response:', result)

    if (!response.ok) {
      return {
        success: false,
        error: result.exception || result.message || 'Failed to create user',
        details: result
      }
    }

    return {
      success: true,
      message: `User ${params.email} created successfully in tenant ${params.subdomain}`,
      user: result.data || result.message
    }

  } catch (error: any) {
    console.error('Create tenant user error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create tenant user'
    }
  }
}

/**
 * Check if a user exists in a tenant site
 */
export async function checkTenantUser(email: string, subdomain: string) {
  try {
    // Get tenant details
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: JSON.stringify({ subdomain }),
      fields: JSON.stringify(['name', 'site_url', 'site_config', 'subdomain']),
      limit_page_length: 1
    })

    if (!tenants || tenants.length === 0) {
      return {
        success: false,
        error: `Tenant with subdomain '${subdomain}' not found`
      }
    }

    const tenant = tenants[0]
    const siteConfig = typeof tenant.site_config === 'string' 
      ? JSON.parse(tenant.site_config) 
      : tenant.site_config

    if (!siteConfig || !siteConfig.api_key || !siteConfig.api_secret) {
      return {
        success: false,
        error: 'Site config missing API credentials'
      }
    }

    const siteName = `${subdomain}.localhost`
    const siteUrl = tenant.site_url

    // Check if user exists
    const response = await fetch(`${siteUrl}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${siteConfig.api_key}:${siteConfig.api_secret}`,
        'X-Frappe-Site-Name': siteName
      },
      body: JSON.stringify({
        doctype: 'User',
        filters: { email },
        fields: ['name', 'email', 'full_name', 'enabled', 'user_type'],
        limit_page_length: 1
      })
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.exception || result.message || 'Failed to check user',
        exists: false
      }
    }

    const users = result.message || result.data || []
    const exists = users.length > 0

    return {
      success: true,
      exists,
      user: exists ? users[0] : null
    }

  } catch (error: any) {
    console.error('Check tenant user error:', error)
    return {
      success: false,
      error: error.message || 'Failed to check tenant user',
      exists: false
    }
  }
}
