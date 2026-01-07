#!/usr/bin/env node

/**
 * ERPNext Site Provisioning Script for Docker
 * 
 * This script provisions a new ERPNext site in a Docker environment
 * 
 * Usage:
 *   node provision-site-docker.js --subdomain=acme --admin-email=admin@acme.com --admin-password=secret
 */

const { execSync } = require('child_process')

// Configuration
const DOCKER_COMPOSE_PATH = process.env.DOCKER_COMPOSE_PATH || '/home/ubuntu/frappe_docker'
const DOMAIN = process.env.DOMAIN || 'localhost'
const BACKEND_CONTAINER = process.env.BACKEND_CONTAINER || 'backend'

function parseArgs() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=')
    args[key.replace('--', '')] = value
  })
  return args
}

function execDockerCommand(command, description) {
  console.log(`\n🔧 ${description}...`)
  try {
    const fullCommand = `cd ${DOCKER_COMPOSE_PATH} && docker compose exec -T ${BACKEND_CONTAINER} bash -c "${command.replace(/"/g, '\\"')}"`
    
    const output = execSync(fullCommand, {
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: '/bin/bash'
    })
    console.log(`✅ ${description} completed`)
    return output
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    if (error.stderr) console.error('stderr:', error.stderr)
    throw error
  }
}

async function provisionS with root password
    execDockerCommand(
      `bench new-site ${siteName} --admin-password '${adminPassword}' --db-name ${dbName} --no-mariadb-socket --db-root-password '${DB_ROOT_PASSWORD}'`,
      'Creating new site',
      true
  console.log('\n' + '='.repeat(60))
  console.log(`🚀 Provisioning ERPNext Site: ${siteName}`)
  console.log('='.repeat(60))

  try {
    // 1. Create new site
    execDockerCommand(
      `bench new-site ${siteName} --admin-password '${adminPassword}' --db-name ${dbName} --no-mariadb-socket`,
      'Creating new site'
    )

    // 2. Install ERPNext app
    execDockerCommand(
      `bench --site ${siteName} install-app erpnext`,
      'Installing ERPNext'
    )

    // 3. Set site config
    execDockerCommand(
      `bench --site ${siteName} set-config maintenance_mode 0`,
      'Disabling maintenance mode'
    )

    // 4. Set site as active
    execDockerCommand(
      `bench --site ${siteName} set-config developer_mode 0`,
      'Configuring site settings'
    )

    // 5. Create API user for the site
    const createUserScript = `
import frappe
frappe.init(site='${siteName}')
frappe.connect()
if not frappe.db.exists('User', '${adminEmail}'):
    user = frappe.get_doc({
        'doctype': 'User',
        'email': '${adminEmail}',
        'first_name': 'Admin',
        'send_welcome_email': 0,
        'user_type': 'System User'
    })
    user.insert(ignore_permissions=True)
    user.add_roles('System Manager')
frappe.db.commit()
print('User created/verified')
`
    
    try {
      execDockerCommand(
        `bench --site ${siteName} console --execute "${createUserScript.replace(/\n/g, ';')}"`,
        'Creating admin user'
      )
    } catch (e) {
      console.warn('User creation failed, might already exist')
    }

    // 6. Generate API keys
    const apiKeyScript = `
import frappe
import json
frappe.init(site='${siteName}')
frappe.connect()
user = frappe.get_doc('User', 'Administrator')
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)
user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({'api_key': api_key, 'api_secret': api_secret}))
`
    
    let apiKey = ''
    let apiSecret = ''
    
    try {
      const keysOutput = execDockerCommand(
        `bench --site ${siteName} console --execute "${apiKeyScript.replace(/\n/g, ';')}"`,
        'Generating API keys'
      )
      
      const jsonMatch = keysOutput.match(/\{.*"api_key".*\}/)
      if (jsonMatch) {
        const keys = JSON.parse(jsonMatch[0])
        apiKey = keys.api_key
        apiSecret = keys.api_secret
      }
    } catch (e) {
      console.warn('API key generation failed:', e.message)
    }

    // 7. Enable site
    execDockerCommand(
      `bench --site ${siteName} scheduler enable`,
      'Enabling scheduler'
    )

    console.log('\n' + '='.repeat(60))
    console.log('✅ Site provisioning completed successfully!')
    console.log('='.repeat(60))
    
    // Determine site URL based on domain
    const siteUrl = DOMAIN === 'localhost' 
      ? `http://localhost:8080` 
      : `https://${siteName}`
    
    // Return result
    const result = {
      success: true,
      site_name: siteName,
      site_url: siteUrl,
      admin_url: `${siteUrl}/app`,
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
      execDockerCommand( --db-root-password '${DB_ROOT_PASSWORD}'`,
        'Dropping failed site',
        trueeName} --force --no-backup`,
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
    console.log('  node provision-site-docker.js --subdomain=acme --admin-email=admin@acme.com --admin-password=secret')
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
