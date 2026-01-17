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

// Execute command with real-time progress
async function execWithProgress(command, description) {
    return new Promise((resolve, reject) => {
        log(`🔧 ${description}...`);
        
        const fullCommand = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -w ${BENCH_PATH} -T ${DOCKER_SERVICE} ${command}`;
        
        const proc = spawn('bash', ['-c', fullCommand]);
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            const lines = output.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                log(`  ${line.substring(0, 100)}`);
            });
        });
        
        proc.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            const lines = output.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (!line.includes('Duplicate entry')) {
                    log(`  ⚠ ${line.substring(0, 100)}`);
                }
            });
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, success: true });
            } else {
                reject(new Error(`${description} failed with exit code ${code}\n${stderr}`));
            }
        });
        
        proc.on('error', (error) => {
            reject(new Error(`${description} process error: ${error.message}`));
        });
    });
}

// Execute bench command
async function execBench(command, description) {
    return execWithProgress(`bench ${command}`, description);
}

// Execute Python code using temp file
async function execPythonFile(pythonCode, siteName, description) {
    const timestamp = Date.now();
    const filename = `provision_${timestamp}.py`;
    const localTempPath = path.join(os.tmpdir(), filename);
    const containerTempPath = `/tmp/${filename}`;

    try {
        // Wrap code with frappe initialization
        const wrappedCode = `
import frappe
import sys

frappe.init(site='${siteName}')
frappe.connect()

try:
${pythonCode.split('\n').map(line => '    ' + line).join('\n')}
finally:
    frappe.destroy()
`;

        // Write to local temp file
        await fs.writeFile(localTempPath, wrappedCode, 'utf8');

        // Copy to container
        await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose cp ${localTempPath} ${DOCKER_SERVICE}:${containerTempPath}`,
            { maxBuffer: 10 * 1024 * 1024 }
        );

        // Execute using Python
        const result = await execWithProgress(
            `/home/frappe/frappe-bench/env/bin/python ${containerTempPath}`,
            description
        );
        
        return result.stdout;

    } finally {
        // Cleanup
        try { await fs.unlink(localTempPath); } catch(e){}
        try { 
            await execPromise(
                `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} rm -f ${containerTempPath}`
            );
        } catch(e){}
    }
}

// Validate Site Exists
async function siteExists(siteName) {
    try {
        await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} test -f ${BENCH_PATH}/sites/${siteName}/site_config.json`,
            { timeout: 5000 }
        );
        return true;
    } catch {
        return false;
    }
}

// Validate site has encryption_key
async function validateSite(siteName) {
    try {
        const { stdout } = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} cat ${BENCH_PATH}/sites/${siteName}/site_config.json`,
            { timeout: 5000 }
        );
        const config = JSON.parse(stdout);
        
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
        
        const encryptionKey = crypto.randomBytes(32).toString('base64');
        
        const { stdout } = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} cat ${BENCH_PATH}/sites/${siteName}/site_config.json`,
            { timeout: 5000 }
        );
        
        const config = JSON.parse(stdout);
        config.encryption_key = encryptionKey;
        
        const localTempPath = path.join(os.tmpdir(), `site_config_${Date.now()}.json`);
        const containerTempPath = `/tmp/site_config_${Date.now()}.json`;
        
        await fs.writeFile(localTempPath, JSON.stringify(config, null, 1), 'utf8');
        
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose cp ${localTempPath} ${DOCKER_SERVICE}:${containerTempPath}`);
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} cp ${containerTempPath} ${BENCH_PATH}/sites/${siteName}/site_config.json`);
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} rm ${containerTempPath}`);
        
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
            
            const valid = await validateSite(SITE_NAME);
            if (!valid) {
                await ensureEncryptionKey(SITE_NAME);
            }
        } else {
            const cmd = `bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket`;
            await execWithTimeout(
                execWithProgress(cmd, 'Creating site'),
                TIMEOUTS.SITE_CREATION,
                'Site Creation'
            );
            log(`✓ Site created successfully`);
            
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
                execBench(`--site ${SITE_NAME} install-app nexus_core`, 'Installing nexus_core'),
                TIMEOUTS.APP_INSTALL,
                'App Install'
            );
            log(`✓ nexus_core installed`);
        } catch (e) {
            log(`⚠ App install warning: ${e.message.split('\n')[0]}`);
        }

        // ---------------------------------------------------------
        // STEP 3: CREATE ADMIN USER (using bench commands)
        // ---------------------------------------------------------
        log(`[3/5] Creating admin user: ${ADMIN_EMAIL}...`);
        
        if (!await siteExists(SITE_NAME)) {
            throw new Error(`Critical: Site ${SITE_NAME} not found`);
        }

        const nameParts = FULL_NAME.trim().split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Create system manager using bench command
        log('Creating/updating system manager user...');
        try {
            await execBench(
                `--site ${SITE_NAME} add-system-manager ${ADMIN_EMAIL}`,
                'Creating system manager'
            );
        } catch (e) {
            if (e.message.includes('already exists')) {
                log('User already exists');
            } else {
                throw e;
            }
        }

        // Set password using bench command
        log('Setting user password...');
        await execBench(
            `--site ${SITE_NAME} set-password ${ADMIN_EMAIL} ${PASSWORD}`,
            'Setting password'
        );

        // Update user details using Python
        log('Updating user details...');
        const updateUserScript = `
from frappe.utils.password import update_password

user = frappe.get_doc('User', '${ADMIN_EMAIL}')
user.first_name = '${firstName}'
user.last_name = '${lastName}'
user.enabled = 1

# Ensure System Manager role
has_role = any(role.role == 'System Manager' for role in user.roles)
if not has_role:
    user.add_roles('System Manager')

user.save(ignore_permissions=True)
frappe.db.commit()
print("User details updated")
`;

        await execWithTimeout(
            execPythonFile(updateUserScript, SITE_NAME, 'Updating user details'),
            TIMEOUTS.USER_CREATION,
            'User Update'
        );
        log('✓ User configured successfully');

        // ---------------------------------------------------------
        // STEP 4: SUBSCRIPTION SETTINGS
        // ---------------------------------------------------------
        log('[4/5] Initializing subscription...');
        const settingsScript = `
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
`;

        try {
            await execWithTimeout(
                execPythonFile(settingsScript, SITE_NAME, 'Initializing settings'),
                TIMEOUTS.COMPANY_SETUP,
                'Settings Init'
            );
            log('✓ Subscription set');
        } catch (e) {
            log('⚠ Settings initialization skipped (non-critical)');
        }

        // ---------------------------------------------------------
        // STEP 5: GENERATE KEYS
        // ---------------------------------------------------------
        log('[5/5] Generating API keys...');
        const keyScript = `
import json

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
`;

        const output = await execWithTimeout(
            execPythonFile(keyScript, SITE_NAME, 'Generating API keys'),
            TIMEOUTS.API_KEYS,
            'API Key Generation'
        );
        
        const match = output.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
        
        if (!match) {
            throw new Error(`Could not parse API keys. Output: ${output.substring(0, 200)}`);
        }
        
        const keys = JSON.parse(match[1]);

        // ====================================================================
        // SUCCESS
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
            log(`❌ FATAL: Global timeout after ${TIMEOUTS.TOTAL / 1000}s`);
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

provisionWithTimeout();