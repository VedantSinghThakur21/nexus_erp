'use server'

import { frappeRequest } from '../lib/api'

/**
 * Debug tenant configuration and test API credentials
 */
export async function debugTenantConfig(subdomain: string) {
  try {
    // Get tenant details
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: JSON.stringify({ subdomain }),
      fields: JSON.stringify(['name', 'site_url', 'site_config', 'subdomain', 'status']),
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

    const siteName = `${subdomain}.localhost`
    const siteUrl = tenant.site_url

    const debugInfo = {
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        site_url: siteUrl
      },
      siteConfig: {
        hasConfig: !!siteConfig,
        hasApiKey: !!siteConfig?.api_key,
        hasApiSecret: !!siteConfig?.api_secret,
        apiKeyLength: siteConfig?.api_key?.length,
        apiSecretLength: siteConfig?.api_secret?.length,
        dbName: siteConfig?.db_name
      },
      siteName
    }

    console.log('Tenant debug info:', debugInfo)

    // Test API credentials
    if (siteConfig?.api_key && siteConfig?.api_secret) {
      try {
        console.log('Testing API credentials...')
        const testResponse = await fetch(`${siteUrl}/api/method/frappe.auth.get_logged_user`, {
          method: 'GET',
          headers: {
            'Authorization': `token ${siteConfig.api_key}:${siteConfig.api_secret}`,
            'X-Frappe-Site-Name': siteName
          }
        })

        const testResult = await testResponse.json()
        
        debugInfo.apiTest = {
          status: testResponse.status,
          ok: testResponse.ok,
          result: testResult
        }

        if (testResponse.ok) {
          console.log('API credentials are valid!')
        } else {
          console.error('API credentials failed:', testResult)
        }
      } catch (testError: any) {
        debugInfo.apiTest = {
          error: testError.message
        }
      }
    }

    return {
      success: true,
      debug: debugInfo
    }

  } catch (error: any) {
    console.error('Debug tenant error:', error)
    return {
      success: false,
      error: error.message || 'Failed to debug tenant'
    }
  }
}

/**
 * Regenerate API keys for a tenant site
 */
export async function regenerateTenantApiKeys(subdomain: string, adminPassword: string) {
  try {
    // Get tenant details
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
    const siteName = `${subdomain}.localhost`
    const siteUrl = tenant.site_url

    // Login as Administrator to get session
    console.log('Logging in as Administrator to tenant site...')
    const loginResponse = await fetch(`${siteUrl}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Frappe-Site-Name': siteName
      },
      body: new URLSearchParams({
        usr: 'Administrator',
        pwd: adminPassword
      })
    })

    if (!loginResponse.ok) {
      const loginError = await loginResponse.json()
      return {
        success: false,
        error: 'Failed to login as Administrator: ' + (loginError.message || 'Invalid credentials')
      }
    }

    // Extract session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie')
    let sessionId = ''
    if (setCookieHeader) {
      const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
      if (sidMatch) {
        sessionId = sidMatch[1]
      }
    }

    if (!sessionId) {
      return {
        success: false,
        error: 'Failed to extract session ID'
      }
    }

    // Generate new API keys using the session
    console.log('Generating new API keys...')
    const generateResponse = await fetch(`${siteUrl}/api/method/frappe.core.doctype.user.user.generate_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sessionId}`,
        'X-Frappe-Site-Name': siteName
      },
      body: JSON.stringify({
        user: 'Administrator'
      })
    })

    const keysResult = await generateResponse.json()
    
    if (!generateResponse.ok || !keysResult.message) {
      return {
        success: false,
        error: 'Failed to generate API keys',
        details: keysResult
      }
    }

    const newKeys = keysResult.message
    
    // Update tenant record with new keys using MASTER site credentials
    const updatedConfig = {
      db_name: `${subdomain.replace(/-/g, '_')}`,
      api_key: newKeys.api_key,
      api_secret: newKeys.api_secret
    }

    console.log('Updating tenant record in master database...')
    
    // Use master site API credentials to update the Tenant record
    const masterUrl = process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080'
    const masterApiKey = process.env.ERP_API_KEY
    const masterApiSecret = process.env.ERP_API_SECRET

    const updateResponse = await fetch(`${masterUrl}/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${masterApiKey}:${masterApiSecret}`
      },
      body: JSON.stringify({
        doctype: 'Tenant',
        name: tenant.name,
        fieldname: 'site_config',
        value: JSON.stringify(updatedConfig)
      })
    })

    if (!updateResponse.ok) {
      const updateError = await updateResponse.json()
      console.error('Failed to update tenant record:', updateError)
      return {
        success: false,
        error: 'Generated new keys but failed to save to database',
        keys: {
          api_key: newKeys.api_key,
          api_secret: newKeys.api_secret
        }
      }
    }

    console.log('Tenant record updated successfully')

    return {
      success: true,
      message: 'API keys regenerated and saved successfully',
      keys: {
        api_key: newKeys.api_key,
        api_secret: newKeys.api_secret
      }
    }

  } catch (error: any) {
    console.error('Regenerate API keys error:', error)
    return {
      success: false,
      error: error.message || 'Failed to regenerate API keys'
    }
  }
}
