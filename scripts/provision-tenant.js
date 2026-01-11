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
    // Check if command actually failed (exit code != 0) vs just stderr output
    // execSync throws on non-zero exit code, but also includes stderr in the error
    if (error.status !== 0) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
    // If exit code is 0, just return stdout (stderr was just warnings)
    return error.stdout ? error.stdout.toString().trim() : '';
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
    // STEP 1: Create Site (or skip if exists)
    console.error(`[1/5] Checking/creating site: ${SITE_NAME}...`);
    
    // Check if site directory exists
    try {
      dockerExec(`test -d sites/${SITE_NAME}`, true);
      console.error(`✓ Site already exists, skipping creation`);
    } catch (e) {
      // Site doesn't exist, create it
      dockerExec(
        `bench new-site ${SITE_NAME} --admin-password ${ADMIN_PASSWORD} --mariadb-root-password ${DB_ROOT_PASSWORD} --no-mariadb-socket`,
        true
      );
      console.error(`✓ Site created successfully`);
    }

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
from frappe.core.doctype.user.user import User

frappe.init(site='${SITE_NAME}')
frappe.connect()
frappe.set_user('Administrator')

try:
    # Check if user already exists
    if frappe.db.exists('User', '${email}'):
        print("User already exists, updating...")
        user = frappe.get_doc('User', '${email}')
        user.enabled = 1
        user.user_type = 'System User'
    else:
        # Create new user following ERPNext best practices
        print(f"Creating new user: ${email}")
        user = frappe.get_doc({
            'doctype': 'User',
            'email': '${email}',
            'first_name': '${fullName.split(' ')[0]}',
            'last_name': '${fullName.split(' ').slice(1).join(' ') || fullName.split(' ')[0]}',
            'enabled': 1,
            'send_welcome_email': 0,
            'user_type': 'System User',
            'new_password': '${password}',  # Let Frappe handle password hashing
            'simultaneous_sessions': 3,  # Allow multiple device logins
            'role_profile_name': None,  # Set roles manually
        })
        user.insert(ignore_permissions=True)
        print(f"User created: {user.name}")
    
    # Set password using Frappe's secure password utility
    # This properly hashes and salts the password
    update_password(user='${email}', pwd='${password}', logout_all_sessions=0)
    print("Password securely hashed and saved")
    
    # Assign System Manager role for full access
    user.add_roles('System Manager')
    print("System Manager role assigned")
    
    # Enable API access for the user
    if not user.api_key and not user.api_secret:
        user.generate_keys()
        print("API keys generated for user")
    
    user.save(ignore_permissions=True)
    frappe.db.commit()
    print(f"USER_CREATED:{user.name}|VERIFIED:1")
    
except Exception as e:
    print(f"ERROR_CREATING_USER:{str(e)}")
    frappe.db.rollback()
    raise
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
    
    // Use Frappe's built-in method to generate API keys
    // frappe.generate_hash() creates secure random tokens
    // The api_secret is stored hashed in the database using the Password field type
    // Reference: https://github.com/frappe/frappe/blob/develop/frappe/core/doctype/user/user.py#L1400-L1431
    const generateKeysScript = `
import frappe

frappe.init(site='${SITE_NAME}')
frappe.connect()
frappe.set_user('Administrator')

# Get the user document
user = frappe.get_doc('User', '${email}')

# Generate API key and secret using Frappe's secure method
api_secret = frappe.generate_hash(length=15)
api_key = user.api_key if user.api_key else frappe.generate_hash(length=15)

# Set the keys on the user document
# The api_secret field is of type Password, so Frappe will automatically hash it on save
user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)

# Commit to database
frappe.db.commit()

# Output in parseable format (output api_secret before it gets hashed)
print(f"API_KEY:{api_key}")
print(f"API_SECRET:{api_secret}")
`;

    const keysOutput = benchRunner(generateKeysScript);
    
    // Parse API credentials from output
    const apiKeyMatch = keysOutput.match(/API_KEY:([a-zA-Z0-9]+)/);
    const apiSecretMatch = keysOutput.match(/API_SECRET:([a-zA-Z0-9]+)/);
    
    if (!apiKeyMatch || !apiSecretMatch) {
      throw new Error('Failed to parse API credentials from output');
    }
    
    const apiKey = apiKeyMatch[1];
    const apiSecret = apiSecretMatch[1];
    
    console.error(`✓ API keys generated`);

    // STEP 6: Create/Update Tenant Record on Master Site
    console.error(`[6/6] Creating tenant record on master site...`);
    
    const createTenantScript = `
import frappe
import json

# Connect to master site
frappe.init(site='${process.env.FRAPPE_SITE_NAME || 'erp.localhost'}')
frappe.connect()

# Create or update tenant record if Tenant DocType exists
if frappe.db.exists('DocType', 'Tenant'):
    # Try to find existing tenant by subdomain
    existing_tenants = frappe.get_all('Tenant', filters={'subdomain': '${subdomain}'}, limit=1)
    
    if existing_tenants:
        # Update existing tenant
        print(f"Updating existing tenant: ${subdomain}")
        tenant = frappe.get_doc('Tenant', existing_tenants[0].name)
    else:
        # Create new tenant
        print(f"Creating new tenant: ${subdomain}")
        tenant = frappe.get_doc({
            'doctype': 'Tenant',
            'subdomain': '${subdomain}',
            'organization_name': '${organizationName}',
            'company_name': '${organizationName}',
            'email': '${email}',
            'owner_email': '${email}'
        })
    
    # Update fields (for both new and existing)
    tenant.status = 'active'
    tenant.site_url = 'http://${subdomain}.localhost:8080'
    tenant.site_config = json.dumps({
        'api_key': '${apiKey}',
        'api_secret': '${apiSecret}',
        'site_name': '${SITE_NAME}'
    })
    
    tenant.save(ignore_permissions=True)
    frappe.db.commit()
    print("TENANT_RECORD_CREATED")
else:
    print("TENANT_DOCTYPE_NOT_FOUND")
`;

    try {
      benchRunner(createTenantScript);
      console.error(`✓ Tenant record created on master site`);
    } catch (error) {
      console.error(`⚠ Tenant record creation skipped (DocType may not exist)`);
    }

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
