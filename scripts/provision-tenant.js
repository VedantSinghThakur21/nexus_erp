const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = util.promisify(exec);

// Usage: node scripts/provision-tenant.js <subdomain> <email> <fullname> <password> <organizationName>
const args = process.argv.slice(2);
const SUBDOMAIN = args[0];
const ADMIN_EMAIL = args[1];
const FULL_NAME = args[2] || 'Admin';
const PASSWORD = args[3];
const COMPANY_NAME = args[4] || 'My Company';

if (!SUBDOMAIN || !ADMIN_EMAIL || !PASSWORD) {
    console.error(JSON.stringify({
        success: false,
        error: 'Missing required arguments',
        usage: 'node provision-tenant.js <subdomain> <email> <fullname> <password> <organizationName>'
    }));
    process.exit(1);
}

const SITE_NAME = `${SUBDOMAIN}.localhost`;
const DOCKER_COMPOSE_DIR = process.env.HOME ? `${process.env.HOME}/frappe_docker` : '/home/ubuntu/frappe_docker';
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'vedant@21'; 
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Helper to execute bench commands
async function execBench(command, throwOnError = true) {
    try {
        const { stdout, stderr } = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bench ${command}`
        );
        return { stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error) {
        if (throwOnError) {
            throw new Error(`Bench command failed: ${command}\n${error.message}`);
        }
        return { stdout: error.stdout?.toString() || '', stderr: error.stderr?.toString() || '' };
    }
}

// Helper to execute Python code in Frappe context using temp file
async function execFrappePython(pythonCode, stepName) {
    const tempFileName = `/tmp/provision_${Date.now()}_${Math.floor(Math.random() * 10000)}.py`;
    const localTempFile = path.join('/tmp', `local_${Date.now()}.py`);
    
    try {
        // Write Python code to local temp file
        fs.writeFileSync(localTempFile, pythonCode);
        
        // Copy to container
        await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose cp "${localTempFile}" ${DOCKER_SERVICE}:${tempFileName}`
        );
        
        // Execute using Python directly with Frappe bench environment
        const { stdout, stderr } = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -w /home/frappe/frappe-bench -T ${DOCKER_SERVICE} /home/frappe/frappe-bench/env/bin/python ${tempFileName}`
        );
        
        return stdout.trim();
    } catch (error) {
        const output = error.stdout?.toString() || error.stderr?.toString() || "";
        throw new Error(`Step '${stepName}' failed.\nOutput: ${output}\nMessage: ${error.message}`);
    } finally {
        // Cleanup local file
        if (fs.existsSync(localTempFile)) {
            fs.unlinkSync(localTempFile);
        }
        
        // Cleanup container file
        try {
            await execPromise(
                `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} rm -f ${tempFileName}`
            );
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

async function provision() {
    try {
        console.error(`🚀 Starting provisioning for ${SITE_NAME}`);
        console.error(`📂 Working Directory: ${DOCKER_COMPOSE_DIR}`);

        // 1. Check/Create Site
        console.error('[1/5] Checking/creating site...');
        try {
            // Check if site exists AND has valid config
            await execPromise(
                `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} test -f sites/${SITE_NAME}/site_config.json`
            );
            
            // Verify site is actually functional by listing apps
            await execBench(`--site ${SITE_NAME} list-apps`);
            console.error('✓ Site exists and is valid');
        } catch (e) {
            // Create site
            console.error('⚠ Site missing or invalid, creating new...');
            await execPromise(
                `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket --force`
            );
            console.error('✓ Site created successfully');
        }

        // 2. Install App
        console.error('[2/5] Installing nexus_core app...');
        try {
            // Check if app is already installed
            const { stdout } = await execBench(`--site ${SITE_NAME} list-apps`, false);
            if (stdout.includes('nexus_core')) {
                console.error('✓ App already installed');
            } else {
                await execBench(`--site ${SITE_NAME} install-app nexus_core`);
                console.error('✓ App installed successfully');
            }
        } catch (e) {
            console.error(`⚠ App install warning: ${e.message}`);
        }

        // 3. Create Admin User
        console.error(`[3/5] Creating admin user: ${ADMIN_EMAIL}...`);
        
        // Split full name into first and last
        const nameParts = FULL_NAME.trim().split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';

        const createUserCode = `
import frappe
from frappe.utils.password import update_password

frappe.init(site='${SITE_NAME}')
frappe.connect()

email = '${ADMIN_EMAIL}'
first_name = '${firstName}'
last_name = '${lastName}'
password = '${PASSWORD}'

try:
    if frappe.db.exists('User', email):
        print("User exists, updating...")
        user = frappe.get_doc('User', email)
        user.enabled = 1
        user.first_name = first_name
        user.last_name = last_name
        
        # Ensure System Manager role
        has_role = False
        for role in user.roles:
            if role.role == 'System Manager':
                has_role = True
                break
        if not has_role:
            user.append('roles', {'role': 'System Manager'})
        
        user.save(ignore_permissions=True)
    else:
        print("Creating new user...")
        user = frappe.get_doc({
            'doctype': 'User',
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
            'enabled': 1,
            'send_welcome_email': 0,
            'user_type': 'System User'
        })
        user.insert(ignore_permissions=True)
        user.add_roles('System Manager')
    
    # Set password
    update_password(user=email, pwd=password, logout_all_sessions=0)
    frappe.db.commit()
    print("SUCCESS: User created/updated")
except Exception as e:
    frappe.db.rollback()
    print("ERROR: " + str(e))
    import traceback
    traceback.print_exc()
    raise
finally:
    frappe.destroy()
`;
        await execFrappePython(createUserCode, "Create User");
        console.error('✓ User created/updated successfully');

        // 4. Initialize Settings
        console.error('[4/5] Initializing settings...');
        const settingsCode = `
import frappe

frappe.init(site='${SITE_NAME}')
frappe.connect()

try:
    if frappe.db.exists('DocType', 'SaaS Settings'):
        if not frappe.db.exists('SaaS Settings', 'SaaS Settings'):
            s = frappe.new_doc('SaaS Settings')
            s.name = 'SaaS Settings'
            s.insert(ignore_permissions=True)
        
        doc = frappe.get_doc('SaaS Settings', 'SaaS Settings')
        doc.plan_name = 'Free'
        doc.max_users = 5
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        print("SUCCESS: Settings initialized")
    else:
        print("INFO: SaaS Settings DocType not found, skipping...")
except Exception as e:
    print("WARNING: Settings init failed: " + str(e))
    # Don't fail the whole provisioning for this
finally:
    frappe.destroy()
`;
        await execFrappePython(settingsCode, "Init Settings");
        console.error('✓ Settings initialized');

        // 5. Generate API Keys
        console.error('[5/5] Generating API keys...');
        const keysCode = `
import frappe
import json

frappe.init(site='${SITE_NAME}')
frappe.connect()

try:
    user = frappe.get_doc('User', '${ADMIN_EMAIL}')
    
    # Generate keys
    api_secret = frappe.generate_hash(length=15)
    if not user.api_key:
        user.api_key = frappe.generate_hash(length=15)
    
    user.api_secret = api_secret
    user.save(ignore_permissions=True)
    frappe.db.commit()
    
    # Output as JSON
    print("===JSON_START===")
    print(json.dumps({
        "api_key": user.api_key,
        "api_secret": api_secret
    }))
    print("===JSON_END===")
except Exception as e:
    print("ERROR: " + str(e))
    import traceback
    traceback.print_exc()
    raise
finally:
    frappe.destroy()
`;
        const keysOutput = await execFrappePython(keysCode, "Generate Keys");
        
        // Extract JSON from output
        const match = keysOutput.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
        
        if (!match) {
            throw new Error(`Failed to retrieve keys from script output. Output was:\n${keysOutput}`);
        }
        
        const keys = JSON.parse(match[1]);
        console.error('✓ API keys generated');

        // SUCCESS OUTPUT
        console.log(JSON.stringify({
            success: true,
            site: SITE_NAME,
            url: `http://${SITE_NAME}:8080`,
            apiKey: keys.api_key,
            apiSecret: keys.api_secret,
            email: ADMIN_EMAIL,
            organizationName: COMPANY_NAME
        }));

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        console.log(JSON.stringify({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        }));
        process.exit(1);
    }
}

provision();