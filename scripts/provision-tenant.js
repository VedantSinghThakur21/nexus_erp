const { exec, spawn } = require('child_process');
const util = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const execPromise = util.promisify(exec);

// ============================================================================
// CONFIGURATION
// ============================================================================

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

// Environment Config
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in';
const SITE_NAME = `${SUBDOMAIN}.${ROOT_DOMAIN}`;
// Ensure we look in the user's home directory for frappe_docker
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || path.join(os.homedir(), 'frappe_docker');
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'vedant@21';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const BENCH_PATH = '/home/frappe/frappe-bench';

// Timeouts (ms)
const TIMEOUTS = {
    SITE_CREATION: 300000,
    APP_INSTALL: 180000,
    USER_CREATION: 60000,
    COMPANY_SETUP: 60000,
    API_KEYS: 30000,
    TOTAL: 600000
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message) {
    console.error(`[${new Date().toISOString().slice(11, 19)}] ${message}`);
}

class Timer {
    constructor(name) {
        this.name = name;
        this.start = Date.now();
    }
    elapsed() {
        return ((Date.now() - this.start) / 1000).toFixed(1);
    }
    complete() {
        log(`✓ ${this.name} completed in ${this.elapsed()}s`);
    }
}

// Execute with Timeout
async function execWithTimeout(promise, timeoutMs, operationName) {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            log(`⏰ TIMEOUT: ${operationName} exceeded ${timeoutMs / 1000}s limit`);
            reject(new Error(`${operationName} timeout`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutHandle);
        return result;
    } catch (error) {
        clearTimeout(timeoutHandle);
        throw error;
    }
}

// Execute Docker Command
async function execDocker(command, options = {}) {
    // We execute the command inside the container from the bench directory
    // This adheres to "bench has to be accessed using the docker command"
    const fullCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -w ${BENCH_PATH} -T ${DOCKER_SERVICE} ${command}`;
    
    try {
        const { stdout } = await execPromise(fullCmd, options);
        return stdout.trim();
    } catch (error) {
        const errOutput = error.stdout?.toString() || error.stderr?.toString() || error.message;
        throw new Error(`Command failed: ${command}\nOutput: ${errOutput}`);
    }
}

// Execute Python File in Container
async function execPythonFile(pythonCode, siteName, description) {
    const timestamp = Date.now();
    const filename = `provision_${timestamp}.py`;
    const localTempPath = path.join(os.tmpdir(), filename);
    const containerTempPath = `/tmp/${filename}`;

    try {
        // Prepare Python Code with proper Context Setup
        const wrappedCode = `
import sys
import os

# 1. Set Working Directory explicitly to bench root
try:
    os.chdir('${BENCH_PATH}')
except:
    pass

import frappe
from frappe import _

# 2. Imports from user code
${pythonCode}
`;

        // Write to host temp
        await fs.writeFile(localTempPath, wrappedCode, 'utf8');

        // Copy to container
        await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose cp ${localTempPath} ${DOCKER_SERVICE}:${containerTempPath}`
        );

        // Execute in container using absolute python path
        const cmd = `/home/frappe/frappe-bench/env/bin/python ${containerTempPath}`;
        const stdout = await execDocker(cmd);
        
        return stdout;

    } finally {
        try { await fs.unlink(localTempPath); } catch(e){}
        try { await execDocker(`rm -f ${containerTempPath}`); } catch(e){}
    }
}

// Validate Site Exists
async function siteExists(siteName) {
    try {
        await execDocker(`test -f sites/${siteName}/site_config.json`);
        return true;
    } catch {
        return false;
    }
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

async function provision() {
    const totalTimer = new Timer('Full Provisioning');
    
    try {
        log(`🚀 Starting provisioning for ${SITE_NAME}`);
        
        // ---------------------------------------------------------
        // STEP 1: CREATE SITE
        // ---------------------------------------------------------
        log('[1/5] Checking/creating site...');
        if (await siteExists(SITE_NAME)) {
            log(`✓ Site ${SITE_NAME} already exists`);
        } else {
            const cmd = `bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket --force`;
            await execWithTimeout(execDocker(cmd), TIMEOUTS.SITE_CREATION, "Site Creation");
            log(`✓ Site created successfully`);
        }

        // ---------------------------------------------------------
        // STEP 2: INSTALL APP
        // ---------------------------------------------------------
        log('[2/5] Installing nexus_core app...');
        try {
            await execWithTimeout(
                execDocker(`bench --site ${SITE_NAME} install-app nexus_core`),
                TIMEOUTS.APP_INSTALL, "App Install"
            );
            log(`✓ nexus_core installed`);
        } catch (e) {
            log(`⚠ App install warning: ${e.message.split('\n')[0]}`);
        }

        // ---------------------------------------------------------
        // STEP 3: CREATE ADMIN USER
        // ---------------------------------------------------------
        log(`[3/5] Creating admin user: ${ADMIN_EMAIL}...`);
        
        // Validate site path exists before running python
        if (!(await siteExists(SITE_NAME))) {
            throw new Error(`Site ${SITE_NAME} missing after creation step. Provisioning aborted.`);
        }

        const userScript = `
import frappe
from frappe.utils.password import update_password

# Initialize with explicit sites_path='.' to fix IncorrectSitePath error
frappe.init(site='${SITE_NAME}', sites_path='.')
frappe.connect()

try:
    email = '${ADMIN_EMAIL}'
    if frappe.db.exists('User', email):
        user = frappe.get_doc('User', email)
        user.enabled = 1
        user.save(ignore_permissions=True)
        print("User updated")
    else:
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
        print("User created")

    update_password(user=email, pwd='${PASSWORD}', logout_all_sessions=0)
    
    if 'System Manager' not in [r.role for r in user.roles]:
        user.add_roles('System Manager')
        
    frappe.db.commit()
    
except Exception as e:
    frappe.db.rollback()
    print(f"ERROR_USER: {str(e)}")
    sys.exit(1)
finally:
    frappe.destroy()
`;
        await execPythonFile(userScript, SITE_NAME, "Create User");
        log('✓ User configured');

        // ---------------------------------------------------------
        // STEP 4: SUBSCRIPTION SETTINGS
        // ---------------------------------------------------------
        log('[4/5] Initializing subscription...');
        const settingsScript = `
import frappe
# Initialize with explicit sites_path='.'
frappe.init(site='${SITE_NAME}', sites_path='.')
frappe.connect()
try:
    if frappe.db.exists('DocType', 'SaaS Settings'):
        if not frappe.db.exists('SaaS Settings', 'SaaS Settings'):
            s = frappe.new_doc('SaaS Settings')
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
        await execPythonFile(settingsScript, SITE_NAME, "Init Settings");
        log('✓ Subscription set');

        // ---------------------------------------------------------
        // STEP 5: GENERATE KEYS & OUTPUT
        // ---------------------------------------------------------
        log('[5/5] Generating API keys...');
        const keyScript = `
import frappe
import json
import sys

# Initialize with explicit sites_path='.'
frappe.init(site='${SITE_NAME}', sites_path='.')
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
    print(f"ERROR_KEYS: {str(e)}")
    sys.exit(1)
finally:
    frappe.destroy()
`;
        const output = await execPythonFile(keyScript, SITE_NAME, "Generate Keys");
        const match = output.match(/JSON_START\n([\s\S]*)\nJSON_END/);
        
        if (!match) throw new Error(`Could not parse API keys. Output: ${output}`);
        const keys = JSON.parse(match[1]);

        // ====================================================================
        // FINAL SUCCESS OUTPUT (STDOUT)
        // ====================================================================
        console.log(JSON.stringify({
            success: true,
            site: SITE_NAME,
            url: `https://${SITE_NAME}`, // HTTPS for production
            apiKey: keys.api_key,
            apiSecret: keys.api_secret,
            email: ADMIN_EMAIL,
            organizationName: COMPANY_NAME
        }));

        totalTimer.complete();
        process.exit(0);

    } catch (error) {
        log(`❌ PROVISIONING FAILED: ${error.message}`);
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            site: SITE_NAME
        }));
        process.exit(1);
    }
}

provision();