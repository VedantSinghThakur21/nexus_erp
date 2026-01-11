#!/usr/bin/env node

/**
 * Tenant Provisioning Script
 * 
 * Creates a complete tenant environment in ERPNext:
 * 1. New site creation
 * 2. App installation
 * 3. Admin user setup
 * 4. Subscription limits initialization
 * 5. API key generation
 * 
 * Usage:
 *   node provision-tenant.js <subdomain> <email> <fullName> <password> <organizationName>
 * 
 * Output:
 *   JSON object with site details and API credentials
 */

const { execSync } = require('child_process');
const crypto = require('crypto');

// Parse command line arguments
const [subdomain, email, fullName, password, organizationName] = process.argv.slice(2);

if (!subdomain || !email || !fullName || !password || !organizationName) {
  console.error(JSON.stringify({
    success: false,
    error: 'Missing required arguments',
    usage: 'node provision-tenant.js <subdomain> <email> <fullName> <password> <organizationName>'
  }));
  process.exit(1);
}

// Configuration
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'admin';
const SITE_NAME = `${subdomain}.localhost`;

/**
 * Execute docker compose command
 */
function dockerExec(command, silent = false) {
  try {
    const result = execSync(
      `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} ${command}`,
      {
        encoding: 'utf8',
        stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );
    return result.trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Execute Python code via bench console
 */
function benchRunner(pythonCode) {
  // Write Python code to a temporary file and pipe it to bench console
  const tempFile = `/tmp/provision_${Date.now()}.py`;
  
  // Escape the Python code for echo command (use single quotes to avoid most escaping issues)
  const escapedCode = pythonCode
    .replace(/'/g, "'\\''");  // Escape single quotes for bash
  
  try {
    // Create complete bash command that runs inside container using pipe instead of redirection
    const bashCommand = `echo '${escapedCode}' > ${tempFile} && cat ${tempFile} | bench --site ${SITE_NAME} console; EXIT_CODE=$?; rm -f ${tempFile}; exit $EXIT_CODE`;
    
    // Execute the entire command inside the container
    const result = dockerExec(`bash -c "${bashCommand.replace(/"/g, '\\"')}"`);
    
    return result;
  } catch (error) {
    // Cleanup on error (if file still exists)
    try {
      dockerExec(`bash -c "rm -f ${tempFile}"`, true);
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Main provisioning workflow
 */
async function provisionTenant() {
  const startTime = Date.now();
  
  try {
    // STEP 1: Create Site
    console.error(`[1/5] Creating site: ${SITE_NAME}...`);
    dockerExec(
      `bench new-site ${SITE_NAME} --admin-password ${ADMIN_PASSWORD} --mariadb-root-password ${DB_ROOT_PASSWORD} --no-mariadb-socket`,
      true
    );
    console.error(`✓ Site created successfully`);

    // STEP 2: Install App
    console.error(`[2/5] Installing nexus_core app...`);
    try {
      dockerExec(`bench --site ${SITE_NAME} install-app nexus_core`, true);
      console.error(`✓ App installed successfully`);
    } catch (error) {
      // App might not exist yet, continue anyway
      console.error(`⚠ App installation skipped (app may not exist)`);
    }

    // STEP 3: Create Admin User
    console.error(`[3/5] Creating admin user: ${email}...`);
    
    const createUserScript = `
import frappe
from frappe.utils.password import update_password

frappe.init(site='${SITE_NAME}')
frappe.connect()

# Create user
user = frappe.get_doc({
    'doctype': 'User',
    'email': '${email}',
    'first_name': '${fullName.split(' ')[0]}',
    'last_name': '${fullName.split(' ').slice(1).join(' ') || fullName.split(' ')[0]}',
    'enabled': 1,
    'send_welcome_email': 0,
    'user_type': 'System User'
})
user.insert(ignore_permissions=True)

# Set password
update_password(user='${email}', pwd='${password}')

# Assign System Manager role
user.add_roles('System Manager')

frappe.db.commit()
print(f"USER_CREATED:{user.name}")
`;

    benchRunner(createUserScript);
    console.error(`✓ User created successfully`);

    // STEP 4: Initialize Subscription Settings
    console.error(`[4/5] Initializing subscription settings...`);
    
    const initSettingsScript = `
import frappe

frappe.init(site='${SITE_NAME}')
frappe.connect()

# Check if SaaS Settings DocType exists
if frappe.db.exists('DocType', 'SaaS Settings'):
    # Create or update settings
    if frappe.db.exists('SaaS Settings', 'SaaS Settings'):
        settings = frappe.get_doc('SaaS Settings', 'SaaS Settings')
    else:
        settings = frappe.get_doc({
            'doctype': 'SaaS Settings',
            'name': 'SaaS Settings'
        })
    
    settings.plan_name = 'Free'
    settings.max_users = 5
    settings.max_storage = 1.0  # 1GB
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    print("SETTINGS_INITIALIZED")
else:
    # DocType doesn't exist yet, skip
    print("SETTINGS_SKIPPED:DocType not found")
`;

    try {
      benchRunner(initSettingsScript);
      console.error(`✓ Subscription settings initialized`);
    } catch (error) {
      console.error(`⚠ Subscription settings skipped (DocType may not exist)`);
    }

    // STEP 5: Generate API Keys
    console.error(`[5/5] Generating API keys...`);
    
    const generateKeysScript = `
import frappe
import secrets

frappe.init(site='${SITE_NAME}')
frappe.connect()

# Generate API credentials
api_key = secrets.token_hex(16)
api_secret = secrets.token_hex(32)

# Update user with API credentials
frappe.db.set_value('User', '${email}', {
    'api_key': api_key,
    'api_secret': api_secret
})

frappe.db.commit()

# Output in parseable format
print(f"API_KEY:{api_key}")
print(f"API_SECRET:{api_secret}")
`;

    const keysOutput = benchRunner(generateKeysScript);
    
    // Parse API credentials from output
    const apiKeyMatch = keysOutput.match(/API_KEY:([a-f0-9]+)/);
    const apiSecretMatch = keysOutput.match(/API_SECRET:([a-f0-9]+)/);
    
    if (!apiKeyMatch || !apiSecretMatch) {
      throw new Error('Failed to parse API credentials from output');
    }
    
    const apiKey = apiKeyMatch[1];
    const apiSecret = apiSecretMatch[1];
    
    console.error(`✓ API keys generated`);

    // Calculate elapsed time
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n✅ Provisioning completed in ${elapsed}s`);

    // Output final JSON result (STDOUT for parsing by Next.js)
    const result = {
      success: true,
      site: SITE_NAME,
      url: `http://${SITE_NAME}:8080`,
      email: email,
      apiKey: apiKey,
      apiSecret: apiSecret,
      organizationName: organizationName,
      elapsed: parseFloat(elapsed)
    };
    
    console.log(JSON.stringify(result));
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Provisioning failed: ${error.message}`);
    
    // Attempt cleanup
    try {
      console.error(`\n🧹 Attempting cleanup...`);
      dockerExec(`bench drop-site ${SITE_NAME} --mariadb-root-password ${DB_ROOT_PASSWORD} --force`, true);
      console.error(`✓ Site dropped`);
    } catch (cleanupError) {
      console.error(`⚠ Cleanup failed: ${cleanupError.message}`);
    }
    
    // Output error JSON
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      site: SITE_NAME
    }));
    process.exit(1);
  }
}

// Run provisioning
provisionTenant().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  console.log(JSON.stringify({
    success: false,
    error: error.message
  }));
  process.exit(1);
});
