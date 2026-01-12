const { exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Helper to execute commands with live output streaming
async function execWithProgress(command, description) {
    return new Promise((resolve, reject) => {
        if (description) console.error(`${description}`);
        
        const child = spawn('bash', ['-c', `cd ${DOCKER_COMPOSE_DIR} && ${command}`], {
            stdio: ['inherit', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            process.stderr.write(output);
        });
        
        child.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            process.stderr.write(output);
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout: stdout.trim(), stderr: stderr.trim(), success: true });
            } else {
                reject(new Error(`Command failed with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
            }
        });
        
        child.on('error', (error) => {
            reject(new Error(`Failed to start command: ${error.message}`));
        });
    });
}

// Helper to execute commands in container
async function execInContainer(command, throwOnError = true, timeoutMs = 600000) {
    try {
        const { stdout, stderr } = await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} ${command}`,
            { maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs }
        );
        return { stdout: stdout.trim(), stderr: stderr.trim(), success: true };
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

// Helper to run Python code via piping to bench console
async function runPythonCode(pythonCode, siteName) {
    return new Promise((resolve, reject) => {
        // Escape the code properly for shell
        const escapedCode = pythonCode.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
        
        const command = `cd ${DOCKER_COMPOSE_DIR} && echo "${escapedCode}" | docker compose exec -T ${DOCKER_SERVICE} bench --site ${siteName} console`;
        
        exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Python execution failed: ${stderr}\n${stdout}`));
            } else {
                resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
            }
        });
    });
}

// Check if site is properly initialized
async function isSiteValid(siteName) {
    try {
        // Check 1: Directory exists
        const dirCheck = await execInContainer(`test -d sites/${siteName}`, false);
        if (!dirCheck.success) return false;
        
        // Check 2: site_config.json exists
        const configCheck = await execInContainer(`test -f sites/${siteName}/site_config.json`, false);
        if (!configCheck.success) return false;
        
        // Check 3: site_config.json has encryption_key
        const configContent = await execInContainer(`cat sites/${siteName}/site_config.json`, false);
        if (!configContent.success) return false;
        
        try {
            const config = JSON.parse(configContent.stdout);
            if (!config.encryption_key) {
                console.error('⚠ Site config missing encryption_key');
                return false;
            }
        } catch (e) {
            console.error('⚠ Invalid site_config.json format');
            return false;
        }
        
        // Check 4: Database is accessible
        const dbCheck = await execBench(`--site ${siteName} list-apps`, false);
        if (!dbCheck.success) return false;
        
        return true;
    } catch (e) {
        return false;
    }
}

// Fix missing encryption_key by directly editing site_config.json
async function fixEncryptionKey(siteName) {
    try {
        console.error('⚠ Encryption key missing, adding it now...');
        
        // Generate a secure encryption key (32 bytes in base64)
        const encryptionKey = crypto.randomBytes(32).toString('base64');
        
        // Read current config
        const configContent = await execInContainer(`cat sites/${siteName}/site_config.json`);
        const config = JSON.parse(configContent.stdout);
        
        // Add encryption_key
        config.encryption_key = encryptionKey;
        
        // Write config back via temp file
        const tempFile = `/tmp/site_config_${Date.now()}.json`;
        const localTempFile = path.join('/tmp', `local_config_${Date.now()}.json`);
        
        fs.writeFileSync(localTempFile, JSON.stringify(config, null, 1));
        
        // Copy to container
        await execPromise(
            `cd ${DOCKER_COMPOSE_DIR} && docker compose cp "${localTempFile}" ${DOCKER_SERVICE}:${tempFile}`
        );
        
        // Move to correct location
        await execInContainer(`mv ${tempFile} sites/${siteName}/site_config.json`);
        
        // Cleanup
        fs.unlinkSync(localTempFile);
        
        console.error('✓ Encryption key added successfully');
        return true;
    } catch (e) {
        console.error(`Failed to add encryption key: ${e.message}`);
        return false;
    }
}

async function provision() {
    try {
        console.error(`🚀 Starting provisioning for ${SITE_NAME}`);
        console.error(`📂 Working Directory: ${DOCKER_COMPOSE_DIR}`);

        // 1. Check/Create Site
        console.error('[1/5] Checking/creating site...');
        
        let siteValid = await isSiteValid(SITE_NAME);
        
        if (siteValid) {
            console.error('✓ Site exists and is valid');
        } else {
            // Check if site directory exists but is incomplete
            const siteExists = await execInContainer(`test -d sites/${SITE_NAME}`, false);
            
            if (siteExists.success) {
                console.error('⚠ Site exists but is incomplete/corrupted');
                
                // Try to fix encryption key first
                const fixed = await fixEncryptionKey(SITE_NAME);
                if (fixed) {
                    siteValid = await isSiteValid(SITE_NAME);
                    if (siteValid) {
                        console.error('✓ Site fixed and validated');
                    }
                }
            }
            
            // If still not valid, recreate
            if (!siteValid) {
                console.error('⚠ Recreating site from scratch...');
                
                try {
                    await execBench(`drop-site ${SITE_NAME} --force --no-backup`, false);
                    console.error('✓ Cleaned up existing site');
                } catch (e) {
                    // Site might not exist, that's fine
                }
                
                // Create fresh site with progress output
                console.error('[Creating new site - this may take 2-3 minutes]');
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                await execWithProgress(
                    `docker compose exec -T ${DOCKER_SERVICE} bench new-site ${SITE_NAME} --admin-password '${ADMIN_PASSWORD}' --mariadb-root-password '${DB_ROOT_PASSWORD}' --no-mariadb-socket`,
                    '⏳ Starting site creation...'
                );
                
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('✓ Site creation completed');
                console.error('');
                
                // Check and fix encryption_key if needed
                console.error('Validating site configuration...');
                siteValid = await isSiteValid(SITE_NAME);
                if (!siteValid) {
                    const fixed = await fixEncryptionKey(SITE_NAME);
                    if (fixed) {
                        siteValid = await isSiteValid(SITE_NAME);
                    }
                }
                
                if (!siteValid) {
                    throw new Error('Site creation failed - unable to initialize properly');
                }
                
                console.error('✓ Site created and validated');
            }
        }

        // 2. Install App
        console.error('[2/5] Installing nexus_core app...');
        try {
            const { stdout } = await execBench(`--site ${SITE_NAME} list-apps`, false);
            if (stdout.includes('nexus_core')) {
                console.error('✓ App already installed');
            } else {
                console.error('⏳ Installing nexus_core (this may take 1-2 minutes)...');
                await execWithProgress(
                    `docker compose exec -T ${DOCKER_SERVICE} bench --site ${SITE_NAME} install-app nexus_core`,
                    ''
                );
                console.error('✓ App installed successfully');
            }
        } catch (e) {
            console.error(`⚠ App install warning: ${e.message}`);
        }

        // 3. Create Admin User
        console.error(`[3/5] Creating admin user: ${ADMIN_EMAIL}...`);
        
        const nameParts = FULL_NAME.trim().split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        try {
            // Check if user exists
            const checkUserCode = `import frappe
print('exists' if frappe.db.exists('User', '${ADMIN_EMAIL}') else 'not_exists')`;
            
            const userCheck = await runPythonCode(checkUserCode, SITE_NAME);
            
            if (userCheck.stdout.includes('exists')) {
                console.error('User already exists, updating...');
                
                // Update existing user
                const updateUserCode = `import frappe
from frappe.utils.password import update_password

email = '${ADMIN_EMAIL}'
user = frappe.get_doc('User', email)
user.enabled = 1
user.first_name = '${firstName}'
user.last_name = '${lastName}'

# Ensure System Manager role
has_role = any(role.role == 'System Manager' for role in user.roles)
if not has_role:
    user.add_roles('System Manager')

user.save(ignore_permissions=True)
update_password(user=email, pwd='${PASSWORD}', logout_all_sessions=0)
frappe.db.commit()
print('User updated successfully')`;
                
                await runPythonCode(updateUserCode, SITE_NAME);
            } else {
                console.error('Creating new user...');
                
                // Create user using bench add-system-manager
                await execBench(`--site ${SITE_NAME} add-system-manager ${ADMIN_EMAIL}`);
                
                // Set password and update details
                const setupUserCode = `import frappe
from frappe.utils.password import update_password

email = '${ADMIN_EMAIL}'
user = frappe.get_doc('User', email)
user.first_name = '${firstName}'
user.last_name = '${lastName}'
user.save(ignore_permissions=True)
update_password(user=email, pwd='${PASSWORD}', logout_all_sessions=0)
frappe.db.commit()
print('User created successfully')`;
                
                await runPythonCode(setupUserCode, SITE_NAME);
            }
            
            console.error('✓ User created/updated successfully');
        } catch (e) {
            throw new Error(`User creation failed: ${e.message}`);
        }

        // 4. Initialize Settings
        console.error('[4/5] Initializing settings...');
        try {
            const settingsCode = `import frappe

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
    print('Settings initialized')
else:
    print('SaaS Settings not found, skipping')`;
    
            await runPythonCode(settingsCode, SITE_NAME);
            console.error('✓ Settings initialized');
        } catch (e) {
            console.error('⚠ Settings initialization skipped (not critical)');
        }

        // 5. Generate API Keys
        console.error('[5/5] Generating API keys...');
        
        const keysCode = `import frappe
import json

user = frappe.get_doc('User', '${ADMIN_EMAIL}')

# Generate keys
api_secret = frappe.generate_hash(length=15)
if not user.api_key:
    user.api_key = frappe.generate_hash(length=15)

user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()

# Output as JSON
print('===JSON_START===')
print(json.dumps({
    'api_key': user.api_key,
    'api_secret': api_secret
}))
print('===JSON_END===')`;

        const keysResult = await runPythonCode(keysCode, SITE_NAME);
        
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