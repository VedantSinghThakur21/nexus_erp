#!/usr/bin/env node

/**
 * ERPNext Site Provisioning Script
 * 
 * This script provisions a new ERPNext site for a tenant
 * It must be run on the server where Frappe Bench is installed
 * 
 * Usage:
 *   node provision-site.js --subdomain=acme --admin-email=admin@acme.com --admin-password=secret
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration
const BENCH_PATH = process.env.BENCH_PATH || '/home/frappe/frappe-bench'
const MASTER_DB_HOST = process.env.MASTER_DB_HOST || 'localhost'
const MASTER_DB_USER = process.env.MASTER_DB_USER || 'root'
const MASTER_DB_PASSWORD = process.env.MASTER_DB_PASSWORD || ''
const DOMAIN = process.env.DOMAIN || 'nexuserp.com'

function parseArgs() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=')
    args[key.replace('--', '')] = value
  })
  return args
}

function execCommand(command, description) {
  console.log(`\n🔧 ${description}...`)
  try {
    const output = execSync(command, {
      cwd: BENCH_PATH,
      encoding: 'utf-8',
      stdio: 'pipe'
    })
    console.log(`✅ ${description} completed`)
    return output
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    throw error
  }
}

async function provisionSite(subdomain, adminEmail, adminPassword) {
  const siteName = `${subdomain}.${DOMAIN}`
  const dbName = subdomain.replace(/-/g, '_')
  
  console.log('\n' + '='.repeat(60))
  console.log(`🚀 Provisioning ERPNext Site: ${siteName}`)
  console.log('='.repeat(60))

  try {
    // 1. Create new site
    execCommand(
      `bench new-site ${siteName} --admin-password ${adminPassword} --db-name ${dbName}`,
      'Creating new site'
    )

    // 2. Install ERPNext app
    execCommand(
      `bench --site ${siteName} install-app erpnext`,
      'Installing ERPNext'
    )

    // 3. Set site config
    execCommand(
      `bench --site ${siteName} set-config maintenance_mode 0`,
      'Disabling maintenance mode'
    )

    // 4. Create API keys for the administrator
    const apiKeyCommand = `bench --site ${siteName} execute "frappe.core.doctype.user.user.generate_keys" --args "['Administrator']"`
    const apiKeysOutput = execCommand(apiKeyCommand, 'Generating API keys')
    
    // Parse API keys from output
    let apiKey = ''
    let apiSecret = ''
    try {
      const keysMatch = apiKeysOutput.match(/API Key: ([^\n]+)[\s\S]*API Secret: ([^\n]+)/)
      if (keysMatch) {
        apiKey = keysMatch[1].trim()
        apiSecret = keysMatch[2].trim()
      }
    } catch (e) {
      console.warn('Could not parse API keys from output')
    }

    // 5. Enable required modules
    execCommand(
      `bench --site ${siteName} set-config developer_mode 0`,
      'Configuring site settings'
    )

    // 6. Setup nginx config
    execCommand(
      `bench setup nginx`,
      'Setting up nginx configuration'
    )

    // 7. Restart services
    execCommand(
      `sudo service nginx reload`,
      'Reloading nginx'
    )

    console.log('\n' + '='.repeat(60))
    console.log('✅ Site provisioning completed successfully!')
    console.log('='.repeat(60))
    
    // Return result
    const result = {
      success: true,
      site_name: siteName,
      site_url: `https://${siteName}`,
      admin_url: `https://${siteName}/app`,
      db_name: dbName,
      admin_email: adminEmail,
      api_key: apiKey,
      api_secret: apiSecret,
      provisioned_at: new Date().toISOString()
    }

    console.log('\n📋 Site Details:')
    console.log(JSON.stringify(result, null, 2))
    
    return result

  } catch (error) {
    console.error('\n❌ Site provisioning failed:', error.message)
    
    // Attempt cleanup
    try {
      console.log('\n🧹 Attempting cleanup...')
      execCommand(
        `bench drop-site ${siteName} --force`,
        'Dropping failed site'
      )
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError.message)
    }
    
    throw error
  }
}

// Main execution
if (require.main === module) {
  const args = parseArgs()
  
  if (!args.subdomain || !args['admin-email'] || !args['admin-password']) {
    console.error('❌ Missing required arguments')
    console.log('\nUsage:')
    console.log('  node provision-site.js --subdomain=acme --admin-email=admin@acme.com --admin-password=secret')
    process.exit(1)
  }

  provisionSite(args.subdomain, args['admin-email'], args['admin-password'])
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Failed:', error.message)
      process.exit(1)
    })
}

module.exports = { provisionSite }
