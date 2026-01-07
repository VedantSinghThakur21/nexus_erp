'use server'

import { spawn } from 'child_process'
import { frappeRequest } from '../lib/api'
import type { TenantProvisioningResult } from '@/types/tenant'

/**
 * Provision a new ERPNext site for a tenant
 * This calls the provision-site.js script on the server
 */
export async function provisionTenant(
  tenantId: string,
  subdomain: string,
  adminEmail: string,
  adminPassword: string
): Promise<TenantProvisioningResult> {
  try {
    // Update tenant status to provisioning
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Tenant',
      name: tenantId,
      fieldname: 'status',
      value: 'provisioning'
    })

    // Call provisioning script
    const scriptPath = process.env.PROVISION_SCRIPT_PATH || '/home/frappe/nexus_erp/scripts/provision-site.js'
    
    const result = await new Promise<TenantProvisioningResult>((resolve) => {
      const child = spawn('node', [
        scriptPath,
        `--subdomain=${subdomain}`,
        `--admin-email=${adminEmail}`,
        `--admin-password=${adminPassword}`
      ])

      let output = ''
      let errorOutput = ''

      child.stdout.on('data', (data) => {
        const str = data.toString()
        console.log('[Provisioning]:', str)
        output += str
      })

      child.stderr.on('data', (data) => {
        const str = data.toString()
        console.error('[Provisioning Error]:', str)
        errorOutput += str
      })

      child.on('close', async (code) => {
        if (code !== 0) {
          // Provisioning failed
          await frappeRequest('frappe.client.set_value', 'POST', {
            doctype: 'Tenant',
            name: tenantId,
            fieldname: 'status',
            value: 'failed'
          })

          resolve({
            success: false,
            error: `Provisioning failed with code ${code}: ${errorOutput}`
          })
          return
        }

        // Parse result from output
        try {
          const jsonMatch = output.match(/\{[\s\S]*"success":\s*true[\s\S]*\}/)
          if (jsonMatch) {
            const provisionResult = JSON.parse(jsonMatch[0])
            
            // Update tenant with site details using frappe.client.save
            await frappeRequest('frappe.client.save', 'POST', {
              doc: {
                doctype: 'Tenant',
                name: tenantId,
                status: 'active',
                site_url: provisionResult.site_url,
                provisioned_at: provisionResult.provisioned_at,
                site_config: JSON.stringify({
                  db_name: provisionResult.db_name,
                  api_key: provisionResult.api_key,
                  api_secret: provisionResult.api_secret
                })
              }
            })

            resolve({
              success: true,
              site_url: provisionResult.site_url,
              admin_url: provisionResult.admin_url
            })
          } else {
            throw new Error('Could not parse provisioning result')
          }
        } catch (parseError) {
          console.error('Failed to parse provisioning result:', parseError)
          resolve({
            success: false,
            error: 'Provisioning completed but failed to parse result'
          })
        }
      })
    })

    return result

  } catch (error: any) {
    console.error('Provision tenant error:', error)
    
    // Update tenant status to failed
    try {
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Tenant',
        name: tenantId,
        fieldname: 'status',
        value: 'failed'
      })
    } catch (e) {
      console.error('Failed to update tenant status:', e)
    }

    return {
      success: false,
      error: error.message || 'Failed to provision tenant'
    }
  }
}

/**
 * Check if subdomain is available
 */
export async function checkSubdomainAvailability(subdomain: string): Promise<{ available: boolean; error?: string }> {
  try {
    // Validate format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return {
        available: false,
        error: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
      }
    }

    if (subdomain.length < 3) {
      return {
        available: false,
        error: 'Subdomain must be at least 3 characters'
      }
    }

    if (subdomain.length > 63) {
      return {
        available: false,
        error: 'Subdomain must be less than 63 characters'
      }
    }

    // Check reserved subdomains
    const reserved = ['www', 'api', 'app', 'admin', 'mail', 'ftp', 'localhost', 'staging', 'dev', 'test']
    if (reserved.includes(subdomain)) {
      return {
        available: false,
        error: 'This subdomain is reserved'
      }
    }

    // Check if already exists
    const existing = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: { subdomain },
      limit_page_length: 1
    })

    if (existing && existing.length > 0) {
      return {
        available: false,
        error: 'Subdomain is already taken'
      }
    }

    return { available: true }

  } catch (error: any) {
    console.error('Check subdomain error:', error)
    return {
      available: false,
      error: 'Failed to check subdomain availability'
    }
  }
}
