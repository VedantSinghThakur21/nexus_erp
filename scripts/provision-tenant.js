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

# Set Working Directory explicitly to bench root
try:
    os.chdir('${BENCH_PATH}')
except:
    pass

import frappe
from frappe import _

# User code
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

// Validate site has encryption_key
async function validateSite(siteName) {
    try {
        const configContent = await execDocker(`cat sites/${siteName}/site_config.json`);
        const config = JSON.parse(configContent);
        
        if (!config.encryption_key) {
            log(`⚠ Missing encryption_key in site_config.json`);
            return false;
        }
        
        return true;
    } catch (error) {
        log(`⚠ Site validation failed: ${error.message}`);
        return false;
    }
}

// Fix missing encryption_key
async function ensureEncryptionKey(siteName) {
    try {
        log(`🔐 Adding encryption_key to site_config.json...`);
        
        // Generate encryption key
        const encryptionKey = crypto.randomBytes(32).toString('base64');
        
        // Read current config
        const configContent = await execDocker(`cat sites/${siteName}/site_config.json`);
        const config = JSON.parse(configContent);
        config.encryption_key = encryptionKey;
        
        // Write updated config to temp file
        const localTempPath = path.join(os.tmpdir(), `site_config_${Date.now()}.json`);
        const containerTempPath = `/tmp/site_config_${Date.now()}.json`;
        
        await fs.writeFile(localTempPath, JSON.stringify(config, null, 1), 'utf8');
        
        // Copy to container and replace
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose cp ${localTempPath} ${DOCKER_SERVICE}:${containerTempPath}`);
        await execDocker(`cp ${containerTempPath} sites/${siteName}/site_config.json`);
        await execDocker(`rm ${containerTempPath}`);
        
        // Cleanup local temp
        await fs.unlink(localTempPath).catch(() => {});
        
        log(`✓ Encryption key added successfully`);
    } catch (error) {
        log(`⚠ Failed to add encryption_key: ${error.message}`);
        throw error;
    }
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

async function provision() {
    const totalTimer = new Timer('Full Provisioning');
    
    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
        log(`⏱️  Still provisioning: ${totalTimer.elapsed()}s elapsed`);
    }, 30000);
    
    try {
        log(`🚀 Starting provisioning for ${SITE_NAME}`);
        log(`📂 Docker Compose Dir: ${DOCKER_COMPOSE_DIR}`);
        log(`🏗️  Bench Path: ${BENCH_PATH}`);
        
        // ---------------------------------------------------------
        // STEP 1: CREATE SITE
        // ---------------------------------------------------------
        log('[1/5] Checking/creating site...');
        if (await siteExists(SITE_NAME)) {
            log(`✓ Site ${SITE_NAME} already exists`);
            
            // Validate and fix encryption_key if needed
            const valid = await validateSite(SITE_NAME);
            if (!valid) {
                await ensureEncryptionKey(SITE_NAME);
            }
        } else {
            const cmd = `bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket`;
            await execWithTimeout(execDocker(cmd), TIMEOUTS.SITE_CREATION, "Site Creation");
            log(`✓ Site created successfully`);
            
            // Validate and fix encryption_key if needed
            const valid = await validateSite(SITE_NAME);
            if (!valid) {
                await ensureEncryptionKey(SITE_NAME);
            }
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
        
        // Ensure site really exists before python tries to load it
        if (!await siteExists(SITE_NAME)) {
            throw new Error(`Critical: Site ${SITE_NAME} folder not found after creation.`);
        }

        const nameParts = FULL_NAME.trim().split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';

        const userScript = `
import frappe
from frappe.utils.password import update_password

frappe.init(site='${SITE_NAME}')
frappe.connect()

try:
    email = '${ADMIN_EMAIL}'
    if frappe.db.exists('User', email):
        user = frappe.get_doc('User', email)
        user.enabled = 1
        user.first_name = '${firstName}'
        user.last_name = '${lastName}'
        user.save(ignore_permissions=True)
        print("User updated")
    else:
        user = frappe.get_doc({
            'doctype': 'User',
            'email': email,
            'first_name': '${firstName}',
            'last_name': '${lastName}',
            'enabled': 1,
            'send_welcome_email': 0,
            'user_type': 'System User'
        })
        user.insert(ignore_permissions=True)
        user.add_roles('System Manager')
        print("User created")

    update_password(user=email, pwd='${PASSWORD}', logout_all_sessions=0)
    frappe.db.commit()
    
except Exception as e:
    frappe.db.rollback()
    print(f"ERROR_USER: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    frappe.destroy()
`;
        await execWithTimeout(
            execPythonFile(userScript, SITE_NAME, "Create User"),
            TIMEOUTS.USER_CREATION,
            "User Creation"
        );
        log('✓ User configured');

        // ---------------------------------------------------------
        // STEP 4: SUBSCRIPTION SETTINGS
        // ---------------------------------------------------------
        log('[4/5] Initializing subscription...');
        const settingsScript = `
import frappe

frappe.init(site='${SITE_NAME}')
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
        print("Settings initialized")
    else:
        print("SaaS Settings DocType not found")
except Exception as e:
    print(f"Settings warning: {str(e)}")
finally:
    frappe.destroy()
`;
        try {
            await execWithTimeout(
                execPythonFile(settingsScript, SITE_NAME, "Init Settings"),
                TIMEOUTS.COMPANY_SETUP,
                "Settings Init"
            );
            log('✓ Subscription set');
        } catch (e) {
            log('⚠ Settings initialization skipped (non-critical)');
        }

        // ---------------------------------------------------------
        // STEP 5: GENERATE KEYS & OUTPUT
        // ---------------------------------------------------------
        log('[5/5] Generating API keys...');
        const keyScript = `
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
    
    print("===JSON_START===")
    print(json.dumps({
        "api_key": user.api_key,
        "api_secret": api_secret
    }))
    print("===JSON_END===")
except Exception as e:
    print(f"ERROR_KEYS: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    frappe.destroy()
`;
        const output = await execWithTimeout(
            execPythonFile(keyScript, SITE_NAME, "Generate Keys"),
            TIMEOUTS.API_KEYS,
            "API Key Generation"
        );
        
        const match = output.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
        
        if (!match) throw new Error(`Could not parse API keys. Output: ${output}`);
        const keys = JSON.parse(match[1]);

        // ====================================================================
        // FINAL SUCCESS OUTPUT (STDOUT)
        // ====================================================================
        clearInterval(heartbeat);
        totalTimer.complete();
        
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('🎉 PROVISIONING COMPLETED SUCCESSFULLY');
        log(`⏱️  Total time: ${totalTimer.elapsed()}s`);
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log(JSON.stringify({
            success: true,
            site: SITE_NAME,
            url: `https://${SITE_NAME}`,
            apiKey: keys.api_key,
            apiSecret: keys.api_secret,
            email: ADMIN_EMAIL,
            organizationName: COMPANY_NAME,
            duration: `${totalTimer.elapsed()}s`
        }));

        process.exit(0);

    } catch (error) {
        clearInterval(heartbeat);
        
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log(`❌ PROVISIONING FAILED after ${totalTimer.elapsed()}s`);
        log(`❌ Error: ${error.message}`);
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            site: SITE_NAME,
            duration: `${totalTimer.elapsed()}s`
        }));
        process.exit(1);
    }
}

// ============================================================================
// EXECUTION WITH GLOBAL TIMEOUT
// ============================================================================

async function provisionWithTimeout() {
    const globalTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
            log(`❌ FATAL: Global timeout after ${TIMEOUTS.TOTAL / 1000}s (10 minutes)`);
            reject(new Error(`Provisioning timeout after ${TIMEOUTS.TOTAL / 1000} seconds`));
        }, TIMEOUTS.TOTAL)
    );
    
    try {
        await Promise.race([provision(), globalTimeoutPromise]);
    } catch (error) {
        log(`❌ FATAL: ${error.message}`);
        console.log(JSON.stringify({
            success: false,
            error: error.message
        }));
        process.exit(1);
    }
}

// Start provisioning
provisionWithTimeout();