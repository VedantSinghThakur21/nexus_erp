'use server'

import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import { frappeRequest } from '../lib/api'

const execAsync = promisify(exec)

interface ProvisionResult {
  success: boolean
  error?: string
  site_url?: string
  api_key?: string
  api_secret?: string
  email?: string
}

/**
 * Provision a new ERPNext site for a tenant
 * This runs the provision-tenant.js script which creates the site in Docker
 * 
 * CRITICAL: This is a LONG-RUNNING operation (2-5 minutes)
 * We need extended timeouts to prevent SIGTERM
 * 
 * next.config.ts MUST have maxDuration: 600 (10 minutes) to prevent timeout
 */
export async function provisionTenant(
  tenantId: string,
  subdomain: string,
  adminEmail: string,
  adminPassword: string,
  organizationName?: string
): Promise<ProvisionResult> {
  try {
    console.log(`🚀 Starting tenant provisioning for: ${subdomain}.localhost`)
    
    // Determine script path - handle both dev (Windows) and production (Linux)
    const isProduction = process.env.NODE_ENV === 'production'
    const scriptPath = isProduction
      ? '/home/ubuntu/nexus_web/scripts/provision-tenant.js'
      : path.join(process.cwd(), 'scripts', 'provision-tenant.js')
    
    console.log(`📍 Script path: ${scriptPath}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
    
    // Build the command with proper argument escaping
    const fullName = organizationName || subdomain
    const args = [
      subdomain,
      adminEmail,
      fullName,
      adminPassword,
      organizationName || subdomain
    ]
    
    // Construct command - use absolute path to node in production
    const nodeCmd = isProduction ? '/usr/bin/node' : 'node'
    const command = `${nodeCmd} ${scriptPath} ${args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')}`
    
    console.log('📋 Executing provisioning command (args hidden for security)...')
    console.log(`🔧 Working directory: ${process.cwd()}`)
    
    // Execute with extended timeout (10 minutes = 600000ms)
    // CRITICAL: Site creation can take 2-5 minutes in production
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      timeout: 600000, // 10 minutes timeout
      cwd: isProduction ? '/home/ubuntu/nexus_web' : process.cwd(),
      env: {
        ...process.env,
        HOME: process.env.HOME || '/home/ubuntu',
        NODE_ENV: process.env.NODE_ENV || 'production',
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin'
      }
    })
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`⏱️  Provisioning completed in ${elapsed}s`)
    
    // Log any stderr output (progress messages)
    if (stderr) {
      console.error('📋 Provisioning script output:')
      console.error(stderr)
    }
    
    // Parse JSON output from stdout
    // The script outputs progress to stderr and final JSON to stdout
    const lines = stdout.trim().split('\n')
    const jsonLine = lines[lines.length - 1] // Last line should be JSON
    
    console.log('📄 Parsing output (last line):', jsonLine.substring(0, 100) + '...')
    
    let result: any
    try {
      result = JSON.parse(jsonLine)
    } catch (parseError) {
      console.error('❌ Failed to parse provisioning result')
      console.error('Raw output:', stdout)
      throw new Error(`Invalid JSON output from provisioning script: ${jsonLine.substring(0, 200)}`)
    }
    
    if (!result.success) {
      console.error('❌ Provisioning script reported failure:', result.error)
      return {
        success: false,
        error: result.error || 'Provisioning script failed'
      }
    }
    
    console.log('✅ Site provisioned successfully:', result.site)
    
    // Update tenant record in master site with API credentials
    try {
      console.log('📝 Updating tenant record with API credentials...')
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Tenant',
        name: tenantId,
        fieldname: {
          site_config: JSON.stringify({
            api_key: result.apiKey,
            api_secret: result.apiSecret,
            site_url: result.url
          }),
          status: 'Active',
          site_name: result.site
        }
      })
      console.log('✅ Tenant record updated successfully')
    } catch (updateError) {
      console.error('⚠️  Failed to update tenant record:', updateError)
      // Continue anyway - site is provisioned, just failed to update record
    }
    
    return {
      success: true,
      site_url: result.url,
      api_key: result.apiKey,
      api_secret: result.apiSecret,
      email: result.email
    }
    
  } catch (error: any) {
    console.error('❌ Provisioning script error:', error)
    
    // Check if it was a timeout
    if (error.killed && error.signal === 'SIGTERM') {
      console.error('⏱️  Process was killed with SIGTERM (timeout)')
      return {
        success: false,
        error: 'Provisioning timed out after 10 minutes. This usually means:\n' +
               '1. Docker is not running or is overloaded\n' +
               '2. ERPNext database is locked or corrupted\n' +
               '3. Network issues preventing container communication\n' +
               'Please check Docker logs: docker logs frappe_docker-backend-1'
      }
    }
    
    // Check for other common errors
    if (error.code === 'ENOENT') {
      return {
        success: false,
        error: `Provisioning script not found at expected location.\n` +
               `Please ensure scripts/provision-tenant.js exists.\n` +
               `Current working directory: ${process.cwd()}`
      }
    }
    
    // Include stderr/stdout if available for debugging
    let errorMessage = error.message || 'Unknown provisioning error'
    if (error.stderr) {
      errorMessage += `\n\nScript stderr:\n${error.stderr}`
    }
    if (error.stdout) {
      errorMessage += `\n\nScript stdout:\n${error.stdout}`
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

