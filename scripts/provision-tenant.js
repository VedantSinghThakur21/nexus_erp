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

// Command line arguments
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

const SITE_NAME = `${SUBDOMAIN}.avariq.in`;
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || path.join(os.homedir(), 'frappe_docker');
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'vedant@21';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const BENCH_PATH = '/home/frappe/frappe-bench';
const MASTER_APP_URL = process.env.MASTER_APP_URL || 'http://localhost:3000';

// Strict timeouts for each operation (fail-fast approach)
const TIMEOUTS = {
    SITE_CREATION: 300000,    // 5 minutes
    APP_INSTALL: 180000,      // 3 minutes
    USER_CREATION: 60000,     // 1 minute
    COMPANY_SETUP: 60000,     // 1 minute
    API_KEYS: 30000,          // 30 seconds
    TOTAL: 600000             // 10 minutes absolute max
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get timestamp for logging
function ts() {
    return new Date().toISOString().split('T')[1].slice(0, 8);
}

// Log with timestamp
function log(message) {
    console.error(`[${ts()}] ${message}`);
}

// Output JSON progress update (goes to stdout for parsing)
function outputProgress(step, progress, message, details = {}) {
    const update = {
        type: 'progress',
        step,
        progress,
        message,
        timestamp: new Date().toISOString(),
        ...details
    };
    console.log(`__PROGRESS__${JSON.stringify(update)}__END__`);
}

// Timer class for tracking operation duration
class Timer {
    constructor(name) {
        this.name = name;
        this.start = Date.now();
    }
    
    elapsed() {
        return Math.floor((Date.now() - this.start) / 1000);
    }
    
    complete() {
        log(`✓ ${this.name} completed in ${this.elapsed()}s`);
    }
}

// Execute command with timeout and automatic process killing
async function execWithTimeout(promise, timeoutMs, operationName) {
    let timeoutHandle;
    
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            log(`⏰ TIMEOUT: ${operationName} exceeded ${timeoutMs / 1000}s limit`);
            
            // Attempt to kill any hanging processes
            exec(`pkill -f "${operationName}"`, () => {});
            
            reject(new Error(`${operationName} timeout after ${timeoutMs / 1000}s`));
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

// Execute command in Docker container with real-time progress output
async function execWithProgress(command, description) {
    return new Promise((resolve, reject) => {
        log(`🔧 ${description}...`);
        
        const fullCommand = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -w ${BENCH_PATH} -T ${DOCKER_SERVICE} ${command}`;
        
        const proc = spawn('bash', ['-c', fullCommand]);
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                log(`  ${line.substring(0, 100)}`);
                stdout += line + '\n';
            });
        });
        
        proc.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (!line.includes('Duplicate entry')) {
                    log(`  ⚠ ${line.substring(0, 100)}`);
                }
                stderr += line + '\n';
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

// Execute Python file by running it directly with proper Frappe context
async function execPythonFile(pythonCode, siteName, description) {
    const timestamp = Date.now();
    const filename = `provision_${timestamp}.py`;
    const containerTempPath = `/tmp/${filename}`;
    const localTempPath = path.join(os.tmpdir(), filename);
    
    try {
        // Wrap code - bench console will handle frappe.init automatically
        const wrappedCode = `import frappe

${pythonCode}
`;
        
        // Write Python code to local temp file
        await fs.writeFile(localTempPath, wrappedCode, 'utf8');
        
        // Copy file to Docker container
        const copyCommand = `cd ${DOCKER_COMPOSE_DIR} && docker compose cp ${localTempPath} ${DOCKER_SERVICE}:${containerTempPath}`;
        await execPromise(copyCommand, { maxBuffer: 10 * 1024 * 1024 });
        
        // Execute by piping the file to bench console via stdin
        // bench console provides interactive IPython shell but we pipe input
        const benchCommand = `bench --site ${siteName} console < ${containerTempPath}`;
        const result = await execWithProgress(
            benchCommand,
            description
        );
        
        return result.stdout;
        
    } finally {
        // Cleanup temp files
        try {
            await fs.unlink(localTempPath).catch(() => {});
            await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} rm -f ${containerTempPath}`).catch(() => {});
        } catch (cleanupError) {
            log(`⚠ Temp file cleanup warning: ${cleanupError.message}`);
        }
    }
}

// Validate site has all required configuration
async function validateSite(siteName) {
    try {
        // Check site_config.json exists
        const checkConfig = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} test -f ${BENCH_PATH}/sites/${siteName}/site_config.json`,
            { timeout: 5000 }
        );
        
        // Check encryption_key is present
        const readConfig = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} cat ${BENCH_PATH}/sites/${siteName}/site_config.json`,
            { timeout: 5000 }
        );
        
        const config = JSON.parse(readConfig.stdout);
        
        if (!config.encryption_key) {
            log(`⚠ Missing encryption_key in site_config.json`);
            return false;
        }
        
        // Check database is accessible
        const listApps = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bash -c "cd ${BENCH_PATH} && bench --site ${siteName} list-apps"`,
            { timeout: 10000 }
        );
        
        if (!listApps.stdout.includes('frappe')) {
            log(`⚠ Database connection failed`);
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
        const readConfig = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} cat ${BENCH_PATH}/sites/${siteName}/site_config.json`,
            { timeout: 5000 }
        );
        
        const config = JSON.parse(readConfig.stdout);
        config.encryption_key = encryptionKey;
        
        // Write updated config to temp file
        const tempFile = `/tmp/site_config_${Date.now()}.json`;
        const localTempPath = path.join(os.tmpdir(), `site_config_${Date.now()}.json`);
        
        await fs.writeFile(localTempPath, JSON.stringify(config, null, 2), 'utf8');
        
        // Copy to container and replace
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose cp ${localTempPath} ${DOCKER_SERVICE}:${tempFile}`);
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} cp ${tempFile} ${BENCH_PATH}/sites/${siteName}/site_config.json`);
        await execPromise(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} rm ${tempFile}`);
        
        // Cleanup local temp
        await fs.unlink(localTempPath).catch(() => {});
        
        log(`✓ Encryption key added successfully`);
    } catch (error) {
        log(`⚠ Failed to add encryption_key: ${error.message}`);
        throw error;
    }
}

// Check if site already exists
async function siteExists(siteName) {
    try {
        await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} test -d ${BENCH_PATH}/sites/${siteName}`,
            { timeout: 5000 }
        );
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================================================
// MAIN PROVISIONING LOGIC
// ============================================================================

async function provision() {
    const totalTimer = new Timer('Full Provisioning');
    
    // Global heartbeat to show process is alive (every 30 seconds)
    const heartbeatInterval = setInterval(() => {
        log(`⏱️  Still provisioning: ${totalTimer.elapsed()}s elapsed`);
    }, 30000);
    
    try {
        log(`🚀 Starting provisioning for ${SITE_NAME}`);
        log(`📂 Docker Compose Dir: ${DOCKER_COMPOSE_DIR}`);
        log(`🏗️  Bench Path: ${BENCH_PATH}`);
        log(`👤 Admin Email: ${ADMIN_EMAIL}`);
        log(`🏢 Company: ${COMPANY_NAME}`);
        log(`⏰ Total Timeout: ${TIMEOUTS.TOTAL / 1000}s`);
        log('');
        
        // ====================================================================
        // STEP 1: CREATE SITE
        // ====================================================================
        
        log('[1/5] ═══════════════════════════════════════');
        log('[1/5] STEP 1: Create Site');
        outputProgress(1, 0, 'Creating site database');
        const step1Timer = new Timer('Step 1');
        
        const exists = await siteExists(SITE_NAME);
        
        if (exists) {
            log(`✓ Site ${SITE_NAME} already exists`);
            
            // Validate existing site
            const valid = await validateSite(SITE_NAME);
            if (!valid) {
                await ensureEncryptionKey(SITE_NAME);
            }
            
            step1Timer.complete();
        } else {
            log(`Creating new site: ${SITE_NAME}`);
            
            const createCommand = `bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket`;
            
            await execWithTimeout(
                execWithProgress(createCommand, 'Creating site'),
                TIMEOUTS.SITE_CREATION,
                'Site Creation'
            );
            
            // Validate and fix if needed
            log(`Validating site configuration...`);
            const valid = await validateSite(SITE_NAME);
            if (!valid) {
                await ensureEncryptionKey(SITE_NAME);
            }
            
            step1Timer.complete();
        }
        
        outputProgress(1, 20, 'Site created successfully');
        log('[1/5] ═══════════════════════════════════════');
        log('');
        
        // ====================================================================
        // STEP 2: INSTALL APP (if nexus_core exists)
        // ====================================================================
        
        log('[2/5] ═══════════════════════════════════════');
        log('[2/5] STEP 2: Install nexus_core app');
        outputProgress(2, 20, 'Installing applications');
        const step2Timer = new Timer('Step 2');
        
        try {
            const listAppsResult = await execBench(
                `--site ${SITE_NAME} list-apps`,
                'Checking installed apps'
            );
            
            if (listAppsResult.stdout.includes('nexus_core')) {
                log(`✓ nexus_core already installed`);
            } else {
                log(`Installing nexus_core app...`);
                
                await execWithTimeout(
                    execBench(
                        `--site ${SITE_NAME} install-app nexus_core`,
                        'Installing nexus_core'
                    ),
                    TIMEOUTS.APP_INSTALL,
                    'App Installation'
                );
                
                log(`✓ nexus_core installed successfully`);
            }
            
            step2Timer.complete();
            outputProgress(2, 40, 'Applications installed');
        } catch (error) {
            log(`⚠ App installation skipped: ${error.message}`);
        }
        
        log('[2/5] ═══════════════════════════════════════');
        log('');
        
        // ====================================================================
        // STEP 3: CREATE ADMIN USER
        // ====================================================================
        
        log('[3/5] ═══════════════════════════════════════');
        log('[3/5] STEP 3: Create Admin User');
        outputProgress(3, 40, 'Configuring admin user');
        const step3Timer = new Timer('Step 3');
        
        const nameParts = FULL_NAME.trim().split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        log(`Creating user: ${ADMIN_EMAIL} (${firstName} ${lastName})`);
        
        // Create system manager user (without name flags as they're not supported)
        try {
            const addUserResult = await execBench(
                `--site ${SITE_NAME} add-system-manager ${ADMIN_EMAIL}`,
                'Creating system manager user'
            );
            
            if (addUserResult.stdout.includes('already exists') || addUserResult.stderr.includes('already exists')) {
                log(`User already exists`);
            }
        } catch (error) {
            if (error.message.includes('already exists')) {
                log(`User already exists`);
            } else {
                throw error;
            }
        }
        
        // Update user's first and last name using Python
        log(`Updating user name...`);
        const updateNameCode = `
import frappe
user = frappe.get_doc('User', '${ADMIN_EMAIL}')
user.first_name = '${firstName}'
user.last_name = '${lastName}'
user.enabled = 1
user.save(ignore_permissions=True)
frappe.db.commit()
print('Name updated successfully')
`;
        
        await execPythonFile(updateNameCode, SITE_NAME, 'Updating user name');
        
        // Set password
        log(`Setting user password...`);
        await execWithTimeout(
            execBench(
                `--site ${SITE_NAME} set-password ${ADMIN_EMAIL} ${PASSWORD}`,
                'Setting user password'
            ),
            TIMEOUTS.USER_CREATION,
            'Password Update'
        );
        
        // Verify user permissions
        log(`Verifying user permissions...`);
        const verifyUserCode = `
import frappe
import json

user = frappe.get_doc('User', '${ADMIN_EMAIL}')
roles = [r.role for r in user.roles]

print(json.dumps({
    'user_type': user.user_type,
    'roles': roles,
    'enabled': user.enabled
}))
`;
        
        const verifyResult = await execPythonFile(
            verifyUserCode,
            SITE_NAME,
            'Verifying user'
        );
        
        log(`User details: ${verifyResult.substring(0, 200)}`);
        
        step3Timer.complete();
        outputProgress(3, 60, 'Admin user configured');
        log('[3/5] ═══════════════════════════════════════');
        log('');
        
        // ====================================================================
        // STEP 4: CREATE COMPANY
        // ====================================================================
        
        log('[4/5] ═══════════════════════════════════════');
        log('[4/5] STEP 4: Create Company');
        outputProgress(4, 60, 'Setting up company');
        const step4Timer = new Timer('Step 4');
        
        try {
            log(`Checking if company '${COMPANY_NAME}' exists...`);
            
            const companyCheckCode = `
import frappe

company_exists = frappe.db.exists('Company', '${COMPANY_NAME}')
print('exists' if company_exists else 'not_exists')
`;
            
            const checkResult = await execPythonFile(
                companyCheckCode,
                SITE_NAME,
                'Checking company'
            );
            
            if (checkResult.includes('exists')) {
                log(`✓ Company already exists`);
            } else {
                log(`Creating company: ${COMPANY_NAME}`);
                
                // Generate safe abbreviation (alphanumeric only, max 5 chars)
                const safeAbbr = COMPANY_NAME.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'COMP';
                
                const createCompanyCode = `
import frappe

company = frappe.new_doc('Company')
company.company_name = '${COMPANY_NAME}'
company.abbr = '${safeAbbr}'
company.default_currency = 'USD'
company.country = 'United States'

company.insert(ignore_permissions=True)
frappe.db.commit()

print('Company created successfully')
`;
                
                await execWithTimeout(
                    execPythonFile(
                        createCompanyCode,
                        SITE_NAME,
                        'Creating company'
                    ),
                    TIMEOUTS.COMPANY_SETUP,
                    'Company Creation'
                );
                
                log(`✓ Company created successfully`);
            }
            
            step4Timer.complete();
            outputProgress(4, 80, 'Company created');
        } catch (error) {
            log(`⚠ Company creation skipped (non-critical): ${error.message}`);
        }
        
        log('[4/5] ═══════════════════════════════════════');
        log('');
        
        // ====================================================================
        // STEP 5: GENERATE API KEYS
        // ====================================================================
        
        log('[5/5] ═══════════════════════════════════════');
        log('[5/5] STEP 5: Generate API Keys');
        outputProgress(5, 80, 'Generating API keys');
        const step5Timer = new Timer('Step 5');
        
        const generateKeysCode = `
import frappe
import json

user = frappe.get_doc('User', '${ADMIN_EMAIL}')

api_secret = frappe.generate_hash(length=15)

if not user.api_key:
    user.api_key = frappe.generate_hash(length=15)

user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()

print('===JSON_START===')
print(json.dumps({
    'api_key': user.api_key,
    'api_secret': api_secret
}))
print('===JSON_END===')
`;
        
        log(`Generating API keys for ${ADMIN_EMAIL}...`);
        
        const keysResult = await execWithTimeout(
            execPythonFile(
                generateKeysCode,
                SITE_NAME,
                'Generating API keys'
            ),
            TIMEOUTS.API_KEYS,
            'API Key Generation'
        );
        
        // Extract JSON from output (filter out IPython prompts)
        const match = keysResult.match(/===JSON_START===([\s\S]*?)===JSON_END===/m);
        
        if (!match) {
            throw new Error(`Failed to retrieve API keys. Output was:\n${keysResult}`);
        }
        
        // Extract the JSON by removing IPython prompts
        // The JSON might be on the same line as "In [X]:" or "...:""
        let jsonString = match[1]
            .split('\n')
            .map(line => {
                // Remove IPython prompts from the start of lines
                return line
                    .replace(/^\s*In \[\d+\]:\s*/, '')
                    .replace(/^\s*Out\[\d+\]:\s*/, '')
                    .replace(/^\s*\.\.\.:\s*/, '')
                    .trim();
            })
            .filter(line => line.length > 0) // Remove empty lines
            .join('');
        
        log(`Extracted JSON: ${jsonString}`);
        
        if (!jsonString || !jsonString.startsWith('{')) {
            throw new Error(`Failed to extract valid JSON. Raw match was:\n${match[1]}`);
        }
        
        const keys = JSON.parse(jsonString);
        
        step5Timer.complete();
        outputProgress(5, 100, 'Workspace ready!');
        log('[5/5] ═══════════════════════════════════════');
        log('');
        
        // ====================================================================
        // COMPLETION
        // ====================================================================
        
        clearInterval(heartbeatInterval);
        totalTimer.complete();
        
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('🎉 PROVISIONING COMPLETED SUCCESSFULLY');
        log(`⏱️  Total time: ${totalTimer.elapsed()}s`);
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // ====================================================================
        // STEP 6: UPDATE MASTER DATABASE WITH API CREDENTIALS
        // ====================================================================
        // This step updates/creates the SaaS Tenant record in the master database
        // with the generated API credentials. This is NON-CRITICAL - if it fails,
        // the site provisioning is still successful.
        
        let masterDbUpdateStatus = 'pending';
        let masterDbError = null;
        
        try {
            log('');
            log('[6/6] ═══════════════════════════════════════');
            log('[6/6] STEP 6: Update Master Database');
            log('📝 Saving API credentials to master site...');
            
            const maxRetries = 3;
            const retryDelayMs = 2000;
            let lastError = null;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    log(`Attempt ${attempt}/${maxRetries}: Calling ${MASTER_APP_URL}/api/tenant/update-credentials`);
                    
                    const updateResponse = await fetch(`${MASTER_APP_URL}/api/tenant/update-credentials`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            tenantName: SUBDOMAIN,
                            apiKey: keys.api_key,
                            apiSecret: keys.api_secret,
                            ownerEmail: ADMIN_EMAIL
                        })
                    });
                    
                    const updateData = await updateResponse.json();
                    
                    if (updateResponse.ok) {
                        masterDbUpdateStatus = 'success';
                        log(`✅ Master DB ${updateData.action || 'updated'}: ${updateData.tenantRecord || SUBDOMAIN}`);
                        break;
                    } else if (updateResponse.status === 207) {
                        // Multi-Status: Partial success
                        masterDbUpdateStatus = 'partial';
                        masterDbError = updateData.warning || updateData.error;
                        log(`⚠️ Provisioning succeeded but master DB update had warnings`);
                        log(`⚠️ ${updateData.warning || 'Unknown warning'}`);
                        break;
                    } else {
                        lastError = updateData.error || 'Unknown error';
                        log(`⚠️ Attempt ${attempt} failed: ${lastError}`);
                        if (attempt < maxRetries) {
                            log(`Retrying in ${retryDelayMs / 1000}s...`);
                            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                        }
                    }
                } catch (fetchError) {
                    lastError = fetchError.message;
                    log(`⚠️ Attempt ${attempt} error: ${lastError}`);
                    if (attempt < maxRetries) {
                        log(`Retrying in ${retryDelayMs / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                    }
                }
            }
            
            if (masterDbUpdateStatus === 'pending') {
                masterDbUpdateStatus = 'failed';
                masterDbError = lastError || 'All retry attempts failed';
                log(`⚠️ Failed to update master database after ${maxRetries} attempts: ${masterDbError}`);
                log(`⚠️ This does not affect the provisioned site - you can update manually`);
            }
            
            log('[6/6] ═══════════════════════════════════════');
            
        } catch (updateError) {
            masterDbUpdateStatus = 'error';
            masterDbError = updateError.message;
            log(`⚠️ Error contacting master database API: ${updateError.message}`);
            log(`⚠️ Site provisioning succeeded - master DB update can be retried later`);
        }
        
        log('');
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('✅ SITE PROVISIONING COMPLETE');
        if (masterDbUpdateStatus === 'success') {
            log('✅ Master database synchronized');
        } else {
            log('⚠️  Master database sync incomplete (non-critical)');
        }
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Output success JSON to stdout
        console.log(JSON.stringify({
            success: true,
            site: SITE_NAME,
            url: `https://${SITE_NAME}`,
            apiKey: keys.api_key,
            apiSecret: keys.api_secret,
            email: ADMIN_EMAIL,
            organizationName: COMPANY_NAME,
            duration: `${totalTimer.elapsed()}s`,
            masterDbSync: {
                status: masterDbUpdateStatus,
                error: masterDbError
            }
        }));
        
    } catch (error) {
        clearInterval(heartbeatInterval);
        
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log(`❌ PROVISIONING FAILED after ${totalTimer.elapsed()}s`);
        log(`❌ Error: ${error.message}`);
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Output error JSON to stdout
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
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
            error: error.message,
            stack: error.stack
        }));
        process.exit(1);
    }
}

// Start provisioning
provisionWithTimeout();