const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

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

const SITE_NAME = `${SUBDOMAIN}.avariq.in`;
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || path.join(os.homedir(), 'frappe_docker');
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const BENCH_PATH = '/home/frappe/frappe-bench';

// Strict timeouts for each operation (fail-fast approach)
const TIMEOUTS = {
    SITE_CREATE: 300000,   // 5 minutes max
    APP_INSTALL: 180000,   // 3 minutes max
    USER_CREATE: 60000,    // 1 minute max
    COMPANY_CREATE: 60000, // 1 minute max
    API_KEYS: 30000        // 30 seconds max
};

// Utility to get timestamp for logging
function timestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Utility to log with timestamp
function logProgress(message) {
    console.error(`[${timestamp()}] ${message}`);
}

// Helper to track operation duration
class OperationTimer {
    constructor(operationName) {
        this.name = operationName;
        this.startTime = Date.now();
    }
    
    elapsed() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
    
    log(message) {
        logProgress(`[${this.name}] ${message} (${this.elapsed()}s elapsed)`);
    }
    
    complete() {
        logProgress(`✓ ${this.name} completed in ${this.elapsed()}s`);
    }
}

// Timeout wrapper for fail-fast approach
async function withTimeout(promise, timeoutMs, operationName) {
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs/1000}s`)), timeoutMs)
    );
    
    try {
        return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
        if (error.message.includes('timeout')) {
            logProgress(`⏰ TIMEOUT: ${operationName} exceeded ${timeoutMs/1000}s limit`);
        }
        throw error;
    }
}

// Helper to execute commands in container with correct working directory
async function execInContainer(command, throwOnError = true, timeoutMs = 600000, logCommand = true) {
    const timer = new OperationTimer('Container Command');
    
    try {
        const fullCommand = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -w ${BENCH_PATH} -T ${DOCKER_SERVICE} ${command}`;
        
        if (logCommand) {
            logProgress(`🔧 Executing: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);
        }
        
        // Set up heartbeat for long-running commands
        const heartbeatInterval = setInterval(() => {
            timer.log(`Still executing... waiting for output`);
        }, 15000);
        
        const { stdout, stderr } = await execPromise(fullCommand, { 
            maxBuffer: 10 * 1024 * 1024, 
            timeout: timeoutMs 
        });
        
        clearInterval(heartbeatInterval);
        
        if (logCommand) {
            timer.complete();
            if (stderr) logProgress(`⚠ stderr: ${stderr.substring(0, 200)}`);
            if (stdout) logProgress(`📤 stdout: ${stdout.substring(0, 500)}`);
        }
        
        return { 
            stdout: stdout.trim(), 
            stderr: stderr.trim(), 
            success: true 
        };
    } catch (error) {
        logProgress(`❌ Command failed after ${timer.elapsed()}s: ${error.message}`);
        if (throwOnError) {
            throw new Error(`Container command failed: ${command}\n${error.message}`);
        }
        return { 
            stdout: error.stdout?.toString() || '', 
            stderr: error.stderr?.toString() || '', 
            success: false,
            error: error.message 
        };
    }
}

// Helper to execute bench commands
async function execBench(command, throwOnError = true) {
    return execInContainer(`bench ${command}`, throwOnError);
}

// Helper to run Python scripts with correct working directory and site context
async function runPythonScript(siteName, pythonCode, throwOnError = true) {
    const escapedCode = pythonCode.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const command = `${BENCH_PATH}/env/bin/python -c "import frappe; frappe.init(site='${siteName}'); frappe.connect(); ${escapedCode}"`;
    
    return execInContainer(command, throwOnError);
}

// Helper to run Python code using bench console (more reliable than direct execution)
async function runPythonCode(siteName, pythonCode, throwOnError = true) {
    // Escape the Python code for shell and add exit() at the end
    const codeWithExit = `${pythonCode}\nexit()`;
    const escapedCode = codeWithExit.replace(/"/g, '\\"').replace(/'/g, "'\\'''");
    
    // Use bench console with heredoc to avoid shell escaping issues
    const command = `bench --site ${siteName} console <<'PYTHON_CODE_EOF'
${pythonCode}
exit()
PYTHON_CODE_EOF`;
    
    return execInContainer(command, throwOnError);
}

// Helper to execute Python code via temp file using bench run-python (production-grade approach)
async function execPythonFile(pythonCode, siteName, throwOnError = true) {
    const timestamp = Date.now();
    const filename = `provision_api_keys_${timestamp}.py`;
    const localTempPath = path.join(os.tmpdir(), filename);
    const containerTempPath = `/tmp/${filename}`;
    
    try {
        // 1. Write Python code to local temp file
        await fs.writeFile(localTempPath, pythonCode, 'utf8');
        
        // 2. Copy file to Docker container
        const copyCommand = `cd ${DOCKER_COMPOSE_DIR} && docker compose cp ${localTempPath} ${DOCKER_SERVICE}:${containerTempPath}`;
        await execPromise(copyCommand, { maxBuffer: 10 * 1024 * 1024 });
        
        // 3. Execute using direct Python with frappe context (NOT bench execute which expects method names)
        const result = await execInContainer(
            `/home/frappe/frappe-bench/env/bin/python -c "import frappe; frappe.init(site='${siteName}'); frappe.connect(); exec(open('${containerTempPath}').read())"`,
            throwOnError
        );
        
        return result;
        
    } finally {
        // 4. Cleanup: Remove temp files from both local and container
        try {
            await fs.unlink(localTempPath).catch(() => {});
            await execInContainer(`rm -f ${containerTempPath}`, false);
        } catch (cleanupError) {
            console.error(`Warning: Temp file cleanup failed: ${cleanupError.message}`);
        }
    }
}

// Check if site is properly initialized (now checks for site_config.json)
async function isSiteValid(siteName) {
    try {
        // Check 1: site_config.json exists (critical file)
        const configCheck = await execInContainer(`test -f sites/${siteName}/site_config.json`, false);
        if (!configCheck.success) {
            console.error('⚠ Site config file missing');
            return false;
        }
        
        // Check 2: site_config.json has required keys
        const configContent = await execInContainer(`cat sites/${siteName}/site_config.json`, false);
        if (!configContent.success) {
            console.error('⚠ Cannot read site_config.json');
            return false;
        }
        
        try {
            const config = JSON.parse(configContent.stdout);
            if (!config.db_name) {
                console.error('⚠ Site config missing db_name');
                return false;
            }
        } catch (e) {
            console.error('⚠ Invalid site_config.json format');
            return false;
        }
        
        // Check 3: Database is accessible
        const dbCheck = await execBench(`--site ${siteName} list-apps`, false);
        if (!dbCheck.success) {
            console.error('⚠ Database not accessible');
            return false;
        }
        
        return true;
    } catch (e) {
        return false;
    }
}

async function provision() {
    const provisionTimer = new OperationTimer('Full Provisioning');
    
    // Global heartbeat to show process is alive
    const heartbeatInterval = setInterval(() => {
        logProgress(`⏱️  Provisioning heartbeat: ${provisionTimer.elapsed()}s elapsed`);
    }, 10000);
    
    try {
        logProgress(`🚀 Starting provisioning for ${SITE_NAME}`);
        logProgress(`📂 Working Directory: ${DOCKER_COMPOSE_DIR}`);
        logProgress(`🏗️  Bench Path: ${BENCH_PATH}`);
        logProgress(`👤 Admin Email: ${ADMIN_EMAIL}`);
        logProgress(`🏢 Company: ${COMPANY_NAME}`);
        logProgress(`⏰ Timeout: 10 minutes`);
        logProgress('');

        // 1. Check/Create Site
        logProgress('[1/5] ═══════════════════════════════════════');
        logProgress('[1/5] STEP 1: Checking/creating site');
        const step1Timer = new OperationTimer('Step 1');
        
        logProgress('Validating existing site...');
        const siteValid = await isSiteValid(SITE_NAME);
        
        if (siteValid) {
            step1Timer.complete();
            logProgress('✓ Site exists and is valid');
        } else {
            logProgress('⚠ Site missing or corrupted, recreating...');
            
            // Clean up any broken site remnants
            logProgress('Cleaning up existing site remnants...');
            try {
                await execBench(`drop-site ${SITE_NAME} --force --no-backup`, false);
                logProgress('✓ Cleaned up database entries');
            } catch (e) {
                logProgress('No database entries to clean');
            }
            
            // Remove site directory if it exists without proper config
            logProgress('Removing site directory...');
            try {
                await execInContainer(`rm -rf sites/${SITE_NAME}`, false, 30000, false);
                logProgress('✓ Directory removed');
            } catch (e) {
                logProgress('No directory to remove');
            }
            
            // Create fresh site
            logProgress('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logProgress('⏳ CREATING NEW SITE - Expected duration: 60-120 seconds');
            logProgress('This involves: database setup, schema migration, default data');
            logProgress('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            const createTimer = new OperationTimer('Site Creation');
            const createSiteCommand = `bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket`;
            
            // Set up progress monitoring for site creation
            const siteCreationHeartbeat = setInterval(() => {
                createTimer.log('Site creation in progress... (Database initialization can take time)');
            }, 15000);
            
            try {
                await withTimeout(
                    execInContainer(createSiteCommand, true, TIMEOUTS.SITE_CREATE),
                    TIMEOUTS.SITE_CREATE,
                    'Site Creation'
                );
            } catch (err) {
                clearInterval(siteCreationHeartbeat);
                if (err.message.includes('timeout')) {
                    // Kill any hanging processes
                    await execInContainer(`pkill -f "new-site ${SITE_NAME}"`, false, 5000, false);
                    throw new Error(`Site creation timeout - killed after ${TIMEOUTS.SITE_CREATE/1000}s. Check Docker/MariaDB status.`);
                }
                throw err;
            }
            
            clearInterval(siteCreationHeartbeat);
            createTimer.complete();
            logProgress('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logProgress('');
            
            // CRITICAL DEBUG: Verify site was actually created
            logProgress('🔍 DEBUG: Checking if site directory exists...');
            const checkDir = await execInContainer(`ls -la sites/${SITE_NAME}`, false, 5000, true);
            if (checkDir.success) {
                logProgress(`✅ Site directory confirmed: ${checkDir.stdout.substring(0, 200)}`);
            } else {
                logProgress(`❌ WARNING: Site directory not found immediately after creation!`);
            }
            
            // Check database was created
            logProgress('🔍 DEBUG: Checking if database exists...');
            const checkDb = await execInContainer(`mysql -uroot -p${DB_ROOT_PASSWORD} -e "SHOW DATABASES LIKE '%${SITE_NAME.replace(/\./g, '_')}%';"`, false, 5000, true);
            if (checkDb.success) {
                logProgress(`✅ Database confirmed: ${checkDb.stdout}`);
            } else {
                logProgress(`❌ WARNING: Database not found!`);
            }
            
            // Verify the site was created properly
            logProgress('Validating site configuration...');
            const newSiteValid = await isSiteValid(SITE_NAME);
            if (!newSiteValid) {
                throw new Error('Site creation failed - site is not properly initialized');
            }
            
            step1Timer.complete();
            logProgress('✓ Site created and validated');
        }
        logProgress('[1/5] ═══════════════════════════════════════');
        logProgress('');

        // 2. Install App (if nexus_core exists)
        logProgress('[2/5] ═══════════════════════════════════════');
        logProgress('[2/5] STEP 2: Installing nexus_core app');
        const step2Timer = new OperationTimer('Step 2');
        try {
            logProgress('Checking installed apps...');
            const { stdout } = await execBench(`--site ${SITE_NAME} list-apps`, false);
            if (stdout.includes('nexus_core')) {
                step2Timer.complete();
                logProgress('✓ App already installed');
            } else {
                logProgress('⏳ Installing nexus_core (30-60 seconds expected)...');
                const installTimer = new OperationTimer('App Installation');
                await withTimeout(
                    execBench(`--site ${SITE_NAME} install-app nexus_core`, false),
                    TIMEOUTS.APP_INSTALL,
                    'App Installation'
                );
                installTimer.complete();
                step2Timer.complete();
                logProgress('✓ App installed successfully');
            }
        } catch (e) {
            logProgress(`⚠ App install skipped: ${e.message}`);
        }
        logProgress('[2/5] ═══════════════════════════════════════');
        logProgress('');

        // 3. Create Admin User
        logProgress('[3/5] ═══════════════════════════════════════');
        logProgress(`[3/5] STEP 3: Creating admin user: ${ADMIN_EMAIL}`);
        const step3Timer = new OperationTimer('Step 3');
        
        // Split full name
        const nameParts = FULL_NAME.trim().split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        logProgress(`Name: ${firstName} ${lastName}`);
        
        try {
            logProgress('Creating system manager user...');
            const userTimer = new OperationTimer('User Creation');
            
            const addUserResult = await withTimeout(
                execBench(`--site ${SITE_NAME} add-system-manager ${ADMIN_EMAIL} --first-name "${firstName}" --last-name "${lastName}"`, false),
                TIMEOUTS.USER_CREATE,
                'User Creation'
            );
            
            if (!addUserResult.success) {
                if (addUserResult.stderr.includes('already exists') || addUserResult.stdout.includes('already exists')) {
                    logProgress('User already exists, will update password');
                } else {
                    throw new Error(`Failed to create user: ${addUserResult.stderr}`);
                }
            } else {
                userTimer.complete();
            }
            
            logProgress('Setting user password...');
            const passwordTimer = new OperationTimer('Password Update');
            await withTimeout(
                execBench(`--site ${SITE_NAME} set-password ${ADMIN_EMAIL} ${PASSWORD}`, true),
                TIMEOUTS.USER_CREATE,
                'Password Update'
            );
            passwordTimer.complete();
            
            logProgress('Verifying user permissions...');
            const verifyCmd = `--site ${SITE_NAME} console "from frappe import get_doc; import json; user = get_doc('User', '${ADMIN_EMAIL}'); print(json.dumps({'user_type': user.user_type, 'roles': [r.role for r in user.roles], 'enabled': user.enabled}))"`;
            const verifyResult = await execBench(verifyCmd, false);
            logProgress(`User details: ${verifyResult.stdout.substring(0, 200)}`);
            
            step3Timer.complete();
            logProgress('✓ User created/updated successfully');
            
        } catch (e) {
            throw new Error(`User creation failed: ${e.message}`);
        }
        logProgress('[3/5] ═══════════════════════════════════════');
        logProgress('');

        // 4. Create Company
        logProgress('[4/5] ═══════════════════════════════════════');
        logProgress('[4/5] STEP 4: Creating company');
        const step4Timer = new OperationTimer('Step 4');
        try {
            logProgress(`Checking if company '${COMPANY_NAME}' exists...`);
            const companyCheckCode = `import frappe\nimport json\ncompany_exists = frappe.db.exists('Company', '${COMPANY_NAME}')\nprint('exists' if company_exists else 'not_exists')`;
            
            // Use bench execute instead of direct Python
            const companyCheckResult = await execPythonFile(companyCheckCode, SITE_NAME, false);
            
            if (companyCheckResult.stdout.includes('exists')) {
                step4Timer.complete();
                logProgress('✓ Company already exists');
            } else {
                logProgress('Creating new company...');
                const companyTimer = new OperationTimer('Company Creation');
                const createCompanyCode = `import frappe\nimport json\ncompany = frappe.new_doc('Company')\ncompany.company_name = '${COMPANY_NAME}'\ncompany.abbr = '${COMPANY_NAME.substring(0, 5).toUpperCase()}'\ncompany.default_currency = 'USD'\ncompany.country = 'United States'\ncompany.insert(ignore_permissions=True)\nfrappe.db.commit()\nprint('Company created')`;
                
                await withTimeout(
                    execPythonFile(createCompanyCode, SITE_NAME, true),
                    TIMEOUTS.COMPANY_CREATE,
                    'Company Creation'
                );
                companyTimer.complete();
                step4Timer.complete();
                logProgress('✓ Company created successfully');
            }
        } catch (e) {
            logProgress(`⚠ Company creation skipped (non-critical): ${e.message}`);
        }
        logProgress('[4/5] ═══════════════════════════════════════');
        logProgress('');

        // 5. Generate API Keys
        logProgress('[5/5] ═══════════════════════════════════════');
        logProgress('[5/5] STEP 5: Generating API keys');
        const step5Timer = new OperationTimer('Step 5');
        
        logProgress('Preparing API key generation script...');
        // Python code for API key generation (bench run-python handles frappe context automatically)
        const generateKeysCode = `import frappe
import json

# Get user document
user = frappe.get_doc('User', '${ADMIN_EMAIL}')

# Generate API keys
api_secret = frappe.generate_hash(length=15)
user.api_key = user.api_key or frappe.generate_hash(length=15)
user.api_secret = api_secret

# Save and commit
user.save(ignore_permissions=True)
frappe.db.commit()

# Output JSON with clear delimiters
print('===JSON_START===')
print(json.dumps({'api_key': user.api_key, 'api_secret': api_secret}))
print('===JSON_END===')`;
        
        logProgress('Executing API key generation...');
        const keysResult = await withTimeout(
            execPythonFile(generateKeysCode, SITE_NAME, true),
            TIMEOUTS.API_KEYS,
            'API Key Generation'
        );
        
        logProgress('Parsing API key response...');
        // Extract JSON from output
        const match = keysResult.stdout.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
        
        if (!match) {
            throw new Error(`Failed to retrieve API keys. Output was:\n${keysResult.stdout}`);
        }
        
        const keys = JSON.parse(match[1]);
        step5Timer.complete();
        logProgress('✓ API keys generated');
        logProgress('[5/5] ═══════════════════════════════════════');
        logProgress('');
        
        // Cleanup heartbeat
        clearInterval(heartbeatInterval);
        provisionTimer.complete();
        
        logProgress('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logProgress('🎉 PROVISIONING COMPLETED SUCCESSFULLY');
        logProgress(`⏱️  Total time: ${provisionTimer.elapsed()}s`);
        logProgress('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // SUCCESS OUTPUT
        console.log(JSON.stringify({
            success: true,
            site: SITE_NAME,
            url: `https://${SITE_NAME}`,
            apiKey: keys.api_key,
            apiSecret: keys.api_secret,
            email: ADMIN_EMAIL,
            organizationName: COMPANY_NAME
        }));

    } catch (error) {
        clearInterval(heartbeatInterval);
        logProgress('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logProgress(`❌ PROVISIONING FAILED after ${provisionTimer.elapsed()}s`);
        logProgress(`❌ Error: ${error.message}`);
        logProgress('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(JSON.stringify({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        }));
        process.exit(1);
    }
}

// Wrap provision() with timeout
async function provisionWithTimeout() {
    const PROVISION_TIMEOUT = 600000; // 10 minutes
    
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Provisioning timeout after ${PROVISION_TIMEOUT / 1000} seconds (10 minutes). Process may be hung.`)), PROVISION_TIMEOUT)
    );
    
    try {
        await Promise.race([provision(), timeoutPromise]);
    } catch (error) {
        logProgress(`❌ FATAL: ${error.message}`);
        process.exit(1);
    }
}

provisionWithTimeout();
