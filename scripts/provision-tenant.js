const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

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
// Use the user's home directory dynamically, defaulting to 'frappe_docker' folder
const DOCKER_COMPOSE_DIR = path.join(process.env.HOME || '/home/ubuntu', 'frappe_docker');
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'vedant@21'; 
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

async function runPythonScript(pythonCode, stepName) {
    const fileName = `provision_${Date.now()}_${Math.floor(Math.random() * 1000)}.py`;
    const hostPath = path.join(__dirname, fileName);
    const containerPath = `/tmp/${fileName}`;

    try {
        fs.writeFileSync(hostPath, pythonCode);

        // Copy to container
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose cp "${hostPath}" ${DOCKER_SERVICE}:${containerPath}`);

        // Execute in container
        // FIX: Explicitly set working directory (-w) to bench root so frappe.init finds the sites
        // FIX: Use absolute path to python
        const { stdout } = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -w /home/frappe/frappe-bench -T ${DOCKER_SERVICE} /home/frappe/frappe-bench/env/bin/python ${containerPath}`
        );

        return stdout.trim();
    } catch (error) {
        const output = error.stdout?.toString() || error.stderr?.toString() || "";
        throw new Error(`Step '${stepName}' failed.\nOutput: ${output}\nMessage: ${error.message}`);
    } finally {
        if (fs.existsSync(hostPath)) fs.unlinkSync(hostPath);
        try {
            await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} rm ${containerPath}`);
        } catch (e) {}
    }
}

async function provision() {
    try {
        console.error(`🚀 Starting provisioning for ${SITE_NAME}`);
        console.error(`📂 Working Directory: ${DOCKER_COMPOSE_DIR}`);

        // 1. Check/Create Site
        console.error('[1/5] Checking/creating site...');
        try {
             // FIX: Check for site_config.json to ensure the site is actually valid, not just a folder
             await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} test -f sites/${SITE_NAME}/site_config.json`);
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
            await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bench --site ${SITE_NAME} install-app nexus_core`);
            console.error('✓ App installed successfully');
        } catch (e) {
            console.error('⚠ App install warning (might already be installed)');
        }

        // 3. Create Admin User
        console.error(`[3/5] Creating admin user: ${ADMIN_EMAIL}...`);
        const createUserCode = `
import frappe
import sys
from frappe.utils.password import update_password

frappe.init(site='${SITE_NAME}')
frappe.connect()

try:
    email = '${ADMIN_EMAIL}'
    if frappe.db.exists('User', email):
        print("User exists")
        user = frappe.get_doc('User', email)
        user.enabled = 1
        user.save(ignore_permissions=True)
    else:
        print("Creating user")
        user = frappe.get_doc({
            'doctype': 'User',
            'email': email,
            'first_name': '${FULL_NAME.split(' ')[0]}',
            'last_name': '${FULL_NAME.split(' ').slice(1).join(' ') || ''}',
            'enabled': 1,
            'send_welcome_email': 0,
            'roles': [{'role': 'System Manager'}]
        })
        user.insert(ignore_permissions=True)

    update_password(user=email, pwd='${PASSWORD}', logout_all_sessions=0)
    frappe.db.commit()
    print("USER_CREATED")
except Exception as e:
    frappe.db.rollback()
    print(f"ERROR: {str(e)}")
    sys.exit(1)
finally:
    frappe.destroy()
`;
        await runPythonScript(createUserCode, "Create User");
        console.error('✓ User created');

        // 4. Initialize Settings
        console.error('[4/5] Initializing settings...');
        const settingsCode = `
import frappe
import sys

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
except:
    pass
finally:
    frappe.destroy()
`;
        await runPythonScript(settingsCode, "Init Settings");

        // 5. Generate Keys
        console.error('[5/5] Generating API keys...');
        const keysCode = `
import frappe
import json
import sys

frappe.init(site='${SITE_NAME}')
frappe.connect()

try:
    user = frappe.get_doc('User', '${ADMIN_EMAIL}')
    api_secret = frappe.generate_hash(length=15)
    if not user.api_key:
        user.api_key = frappe.generate_hash(length=15)
    
    user.api_secret = api_secret
    user.save(ignore_permissions=True)
    frappe.db.commit()
    
    print("JSON_START")
    print(json.dumps({
        "api_key": user.api_key,
        "api_secret": api_secret
    }))
    print("JSON_END")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
finally:
    frappe.destroy()
`;
        const keysOutput = await runPythonScript(keysCode, "Generate Keys");
        const match = keysOutput.match(/JSON_START\n([\s\S]*)\nJSON_END/);
        
        if (!match) throw new Error("Failed to retrieve keys from script output");
        const keys = JSON.parse(match[1]);

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
        console.log(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
}

provision();