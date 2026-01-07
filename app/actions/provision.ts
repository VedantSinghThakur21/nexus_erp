'use server'

import { spawn } from 'child_process'
import { frappeRequest } from '../lib/api'
import type { TenantProvisioningResult } from '@/types/tenant'

/**
 * Update tenant fields using frappe.client.save
 * More reliable than set_value for multiple fields
 */
async function updateTenant(tenantId: string, updates: Record<string, any>) {
  try {
    // First get the current tenant document
    const tenant = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Tenant',
      name: tenantId
    })

    // Merge updates
    const updatedDoc = {
      ...tenant,
      ...updates,
      doctype: 'Tenant',
      name: tenantId
    }

    // Save the document
    await frappeRequest('frappe.client.save', 'POST', {
      doc: updatedDoc
    })
  } catch (error) {
    console.error('Update tenant error:', error)
    throw error
  }
}

/**
 * Provision a new ERPNext site for a tenant
 * Supports both production provisioning and development mock mode
 */
export async function provisionTenant(
  tenantId: string,
  subdomain: string,
  adminEmail: string,
  adminPassword: string
): Promise<TenantProvisioningResult> {
  try {
    // Update tenant status to provisioning
    await updateTenant(tenantId, { status: 'provisioning' })

    // Check if we should use mock provisioning (for development)
    const useMockProvisioning = process.env.MOCK_PROVISIONING === 'true'
    
    if (useMockProvisioning) {
      console.log('🔧 Using mock provisioning for development')
      
      // Simulate provisioning delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create mock site URL (points to master site in dev)
      const siteUrl = process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080'
      const mockApiKey = `mock_${subdomain}_${Date.now()}`
      const mockApiSecret = `mock_secret_${Math.random().toString(36).substring(2)}`
      
      // Update tenant with mock data
      await updateTenant(tenantId, {
        status: 'active',
        site_url: siteUrl,
        provisioned_at: new Date().toISOString(),
        site_config: JSON.stringify({
          db_name: `${subdomain}_db`,
          api_key: mockApiKey,
          api_secret: mockApiSecret
        })
      })
      
      console.log('✅ Mock provisioning completed for', subdomain)
      
      return {
        success: true,
        site_url: siteUrl,
        admin_url: `${siteUrl}/app`
      }
    }

    // === PRODUCTION PROVISIONING ===
    console.log('🚀 Starting production provisioning for', subdomain)
    
    const scriptPath = process.env.PROVISION_SCRIPT_PATH || '/home/ubuntu/frappe_docker/custom_scripts/provision-site-simple.sh'
    
    const result = await new Promise<TenantProvisioningResult>((resolve) => {
      const child = spawn('bash', [
        scriptPath,
        subdomain,
        adminEmail,
        adminPassword
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
          await updateTenant(tenantId, { status: 'failed' })

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
            
            // Update tenant with site details
            await updateTenant(tenantId, {
              status: 'active',
              site_url: provisionResult.site_url,
              provisioned_at: provisionResult.provisioned_at,
              site_config: JSON.stringify({
                db_name: provisionResult.db_name,
                api_key: provisionResult.api_key,
                api_secret: provisionResult.api_secret
              })
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
          await updateTenant(tenantId, { status: 'failed' })
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
      await updateTenant(tenantId, { status: 'failed' })
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
 * Check provisioning status of a tenant
 */
export async function getProvisioningStatus(tenantId: string): Promise<{
  status: string
  site_url?: string
  error?: string
}> {
  try {
    const tenant = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Tenant',
      name: tenantId
    })

    return {
      status: tenant.status,
      site_url: tenant.site_url
    }
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message
    }
  }
}
