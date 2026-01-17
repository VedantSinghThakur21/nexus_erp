const { exec } = require('child_process');
const util = require('util');
const os = require('os');
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

const SITE_NAME = `${SUBDOMAIN}.avariq.in`;
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || path.join(os.homedir(), 'frappe_docker');
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const BENCH_PATH = '/home/frappe/frappe-bench';

// Helper to execute commands in container with correct working directory
async function execInContainer(command, throwOnError = true, timeoutMs = 600000) {
    try {
        const fullCommand = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -w ${BENCH_PATH} -T ${DOCKER_SERVICE} ${command}`;
        
        const { stdout, stderr } = await execPromise(fullCommand, { 
            maxBuffer: 10 * 1024 * 1024, 
            timeout: timeoutMs 
        });
        
        return { 
            stdout: stdout.trim(), 
            stderr: stderr.trim(), 
            success: true 
        };
    } catch (error) {
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
    try {
        console.error(`🚀 Starting provisioning for ${SITE_NAME}`);
        console.error(`📂 Working Directory: ${DOCKER_COMPOSE_DIR}`);
        console.error(`🏗️  Bench Path: ${BENCH_PATH}`);

        // 1. Check/Create Site
        console.error('[1/5] Checking/creating site...');
        
        const siteValid = await isSiteValid(SITE_NAME);
        
        if (siteValid) {
            console.error('✓ Site exists and is valid');
        } else {
            console.error('⚠ Site missing or corrupted, recreating...');
            
            // Clean up any broken site remnants
            try {
                await execBench(`drop-site ${SITE_NAME} --force --no-backup`, false);
                console.error('✓ Cleaned up existing site');
            } catch (e) {
                // Site might not exist in database, that's fine
            }
            
            // Remove site directory if it exists without proper config
            try {
                await execInContainer(`rm -rf sites/${SITE_NAME}`, false);
            } catch (e) {
                // Ignore errors
            }
            
            // Create fresh site
            console.error('[Creating new site - this may take 2-3 minutes]');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('⏳ Starting site creation...');
            
            const createSiteCommand = `bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket`;
            await execInContainer(createSiteCommand, true);
            
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('✓ Site creation completed');
            console.error('');
            
            // Verify the site was created properly
            console.error('Validating site configuration...');
            const newSiteValid = await isSiteValid(SITE_NAME);
            if (!newSiteValid) {
                throw new Error('Site creation failed - site is not properly initialized');
            }
            
            console.error('✓ Site created and validated');
        }

        // 2. Install App (if nexus_core exists)
        console.error('[2/5] Installing nexus_core app...');
        try {
            const { stdout } = await execBench(`--site ${SITE_NAME} list-apps`, false);
            if (stdout.includes('nexus_core')) {
                console.error('✓ App already installed');
            } else {
                console.error('⏳ Installing nexus_core...');
                await execBench(`--site ${SITE_NAME} install-app nexus_core`, false);
                console.error('✓ App installed successfully');
            }
        } catch (e) {
            console.error(`⚠ App install skipped: ${e.message}`);
            // Continue even if app install fails
        }

        // 3. Create Admin User
        console.error(`[3/5] Creating admin user: ${ADMIN_EMAIL}...`);
        
        // Split full name
        const nameParts = FULL_NAME.trim().split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        try {
            // Always use bench add-system-manager (it's idempotent)
            // This command creates the user as System User with System Manager role automatically
            console.error('Creating/updating system manager user...');
            
            // This creates the user if it doesn't exist, or updates if it does
            const addUserResult = await execBench(`--site ${SITE_NAME} add-system-manager ${ADMIN_EMAIL} --first-name "${firstName}" --last-name "${lastName}"`, false);
            
            if (!addUserResult.success) {
                // If command failed but it's because user exists, that's okay
                if (addUserResult.stderr.includes('already exists') || addUserResult.stdout.includes('already exists')) {
                    console.error('User already exists, will update password');
                } else {
                    throw new Error(`Failed to create user: ${addUserResult.stderr}`);
                }
            }
            
            // Set/update password using bench command (more reliable than Python script)
            console.error('Setting user password...');
            const setPasswordCmd = await execBench(`--site ${SITE_NAME} set-password ${ADMIN_EMAIL} ${PASSWORD}`, true);
            
            console.error('✓ User created/updated successfully');
            
            // Verification step using bench console
            console.error('Verifying user permissions...');
            const verifyCmd = `--site ${SITE_NAME} console "from frappe import get_doc; import json; user = get_doc('User', '${ADMIN_EMAIL}'); print(json.dumps({'user_type': user.user_type, 'roles': [r.role for r in user.roles], 'enabled': user.enabled}))"`;
            const verifyResult = await execBench(verifyCmd, false);
            console.error('User verification:', verifyResult.stdout);
            
        } catch (e) {
            throw new Error(`User creation failed: ${e.message}`);
        }

        // 4. Create Company
        console.error('[4/5] Creating company...');
        try {
            const companyCheckCode = `company_exists = frappe.db.exists('Company', '${COMPANY_NAME}'); print('exists' if company_exists else 'not_exists')`;
            
            const companyCheck = await runPythonScript(SITE_NAME, companyCheckCode, false);
            
            if (companyCheck.stdout.includes('exists')) {
                console.error('✓ Company already exists');
            } else {
                const createCompanyCode = `company = frappe.new_doc('Company'); company.company_name = '${COMPANY_NAME}'; company.abbr = '${COMPANY_NAME.substring(0, 5).toUpperCase()}'; company.default_currency = 'USD'; company.country = 'United States'; company.insert(ignore_permissions=True); frappe.db.commit(); print('Company created')`;
                
                await runPythonScript(SITE_NAME, createCompanyCode, true);
                console.error('✓ Company created successfully');
            }
        } catch (e) {
            console.error('⚠ Company creation skipped (non-critical)');
        }

        // 5. Generate API Keys
        console.error('[5/5] Generating API keys...');
        
        const generateKeysCode = `import frappe
import json

user = frappe.get_doc('User', '${ADMIN_EMAIL}')
api_secret = frappe.generate_hash(length=15)
user.api_key = user.api_key or frappe.generate_hash(length=15)
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()

print('===JSON_START===')
print(json.dumps({'api_key': user.api_key, 'api_secret': api_secret}))
print('===JSON_END===')`;
        
        const keysResult = await runPythonCode(SITE_NAME, generateKeysCode, true);
        
        // Extract JSON from output
        const match = keysResult.stdout.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
        
        if (!match) {
            throw new Error(`Failed to retrieve API keys. Output was:\n${keysResult.stdout}`);
        }
        
        const keys = JSON.parse(match[1]);
        console.error('✓ API keys generated');

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
