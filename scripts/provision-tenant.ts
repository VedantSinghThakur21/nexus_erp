import { exec } from 'child_process'
import { promisify } from 'util'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const execAsync = promisify(exec)

interface ProvisionOptions {
    organizationName: string
    adminEmail: string
    adminPassword?: string // Optional, can be generated
    adminFullName?: string // User's full name for System User account
    planType?: 'Free' | 'Pro' | 'Enterprise'
}

const FRA_DOCKER_CONTAINER = process.env.FRA_DOCKER_CONTAINER || 'frappe_docker-backend-1'
const PARENT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const WORK_DIR = '/workspace/frappe_docker' // Golden Path Requirement

async function runCommand(command: string) {
    console.log(`[Provisioning] Running: ${command}`)
    try {
        const { stdout, stderr } = await execAsync(command)
        if (stderr) console.warn(`[Provisioning] Stderr: ${stderr}`)
        return stdout
    } catch (error: any) {
        console.error(`[Provisioning] Error: ${error.message}`)
        throw error
    }
}

export async function provisionTenant({
    organizationName,
    adminEmail,
    adminPassword,
    adminFullName,
    planType = 'Free'
}: ProvisionOptions) {
    // 1. Generate Subdomain
    const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

    const subdomain = `${slug}` // Just the subdomain part
    const siteName = `${subdomain}.${PARENT_DOMAIN}`
    const MASTER_SITE = process.env.MASTER_SITE_NAME || 'erp.localhost';

    console.log(`[Provisioning] Starting provisioning for ${siteName}...`)

    // 0. Pre-flight Check: Check if tenant already exists in Master DB
    try {
        const checkScript = `
import frappe
import json
try:
    if frappe.conf.site_name != "${MASTER_SITE}":
        frappe.init(site="${MASTER_SITE}", sites_path='.')
        frappe.connect()

    exists = frappe.db.exists('SaaS Tenant', {'subdomain': '${subdomain}'})
    email_exists = frappe.db.count('SaaS Tenant', {'owner_email': '${adminEmail}'})
    result = {'exists': bool(exists), 'email_exists': bool(email_exists)}
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`
        // Golden Path: Pipe python to bench console
        // Note: Using 'echo "script" | docker exec ... bench console' is tricky with quotes. 
        // We stick to 'cat <<EOF | docker exec ...' if possible or file write.
        // But user asked for "Pipe a Python script into bench console".
        // The safest way on all OSs (to avoid quote hell) is write to temp file inside container.

        const cleanCheckScript = checkScript.trim()
        const checkFilePath = `/tmp/check_tenant_${subdomain}.py`

        await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${checkFilePath} <<EOF
${cleanCheckScript}
EOF"`)

        // Execute via bench console
        const checkResultStr = await runCommand(`docker exec -w ${WORK_DIR} ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${MASTER_SITE} console < ${checkFilePath}"`)
        await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${checkFilePath}`)

        // Parse output
        const jsonMatch = checkResultStr.match(/\{"exists":.*\}/) || checkResultStr.match(/\{"error":.*\}/)
        if (jsonMatch) {
            const checkResult = JSON.parse(jsonMatch[0])
            if (checkResult.error) {
                console.warn(`[Provisioning] Pre-flight check error: ${checkResult.error}`)
            } else {
                if (checkResult.exists) {
                    console.warn(`[Provisioning] Tenant '${subdomain}' already exists. Skipping provisioning.`)
                    return { success: true, siteName, url: `http://${siteName}`, adminPassword }
                }
                if (checkResult.email_exists) {
                    console.warn(`[Provisioning] User '${adminEmail}' already has a tenant.`)
                    return { success: false, error: 'User already has a tenant registered.' }
                }
            }
        }
    } catch (checkError) {
        console.warn(`[Provisioning] Pre-flight check failed, proceeding anyway...`, checkError)
    }

    try {
        // 2. Create Site (bench new-site)
        // Golden Path Requirement: --no-mariadb-socket
        const dbRootPass = process.env.DB_ROOT_PASSWORD || '123'
        const adminPass = adminPassword || crypto.randomBytes(8).toString('hex')

        await runCommand(
            `docker exec -w ${WORK_DIR} ${FRA_DOCKER_CONTAINER} bench new-site ${siteName} ` +
            `--admin-password '${adminPass}' ` +
            `--db-root-password '${dbRootPass}' ` +
            `--no-mariadb-socket ` + // Golden Path Requirement
            `--install-app nexus_core ` +
            `--force`
        )

        console.log(`[Provisioning] Site created: ${siteName}`)

        // 3. Create SaaS Settings (Golden Path: Pipe Python to bench console)
        const maxUsers = planType === 'Enterprise' ? 1000 : planType === 'Pro' ? 50 : 5

        try {
            const seedScript = `
import frappe
try:
    if frappe.db.exists('SaaS Settings', '${organizationName}'):
        doc = frappe.get_doc('SaaS Settings', '${organizationName}')
    else:
        doc = frappe.new_doc('SaaS Settings')
        
    doc.organization_name = '${organizationName}'
    doc.plan_type = '${planType}'
    doc.max_users = ${maxUsers}
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print("SUCCESS: SaaS Settings seeded.")
except Exception as e:
    print(f"ERROR: Failed to seed SaaS Settings: {e}")
`
            const cleanScript = seedScript.trim()
            const tempFilePath = `/tmp/seed_settings_${subdomain}.py`

            await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${tempFilePath} <<EOF
${cleanScript}
EOF"`)

            const seedOutput = await runCommand(`docker exec -w ${WORK_DIR} ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${siteName} console < ${tempFilePath}"`)
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${tempFilePath}`)

            if (seedOutput.includes("SUCCESS")) console.log("[Provisioning] SaaS Settings initialized.")
            else console.warn("[Provisioning] Warning: SaaS Settings initialization might have failed.")

        } catch (seedError) {
            console.warn(`[Provisioning] Warning: Failed to seed SaaS Settings. Continuing...`, seedError)
        }

        // 3.5 Create System User (Golden Path Requirement: CRITICAL)
        console.log(`[Provisioning] Creating System User (${adminEmail}) on new site...`)
        try {
            const userScript = `
import frappe
import frappe.utils.password
try:
    if not frappe.db.exists('User', '${adminEmail}'):
        user = frappe.new_doc('User')
        user.email = '${adminEmail}'
        user.first_name = '${adminFullName || organizationName}'
        user.enabled = 1
        user.save(ignore_permissions=True)
        print("User created.")
    else:
        user = frappe.get_doc('User', '${adminEmail}')
        print("User exists.")

    # Force Password Update
    frappe.utils.password.update_password('${adminEmail}', '${adminPass}')
    
    # Force Roles
    user.add_roles('System Manager')
    
    frappe.db.commit()
    print("SUCCESS: System User configured.")
except Exception as e:
    print(f"ERROR: Failed to configure System User: {e}")
`
            const cleanUserScript = userScript.trim()
            const userTempPath = `/tmp/create_user_${subdomain}.py`

            await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${userTempPath} <<EOF
${cleanUserScript}
EOF"`)

            const userOutput = await runCommand(`docker exec -w ${WORK_DIR} ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${siteName} console < ${userTempPath}"`)
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${userTempPath}`)

            if (userOutput.includes("SUCCESS")) console.log("[Provisioning] System User configured successfully.")
            else console.error("[Provisioning] Failed to configure System User.")

        } catch (userError) {
            console.error(`[Provisioning] Failed to create System User:`, userError)
        }

        // 4. Register Tenant in Master DB (Golden Path Requirement)
        console.log(`[Provisioning] Registering tenant in Master DB...`)

        try {
            const registerScript = `
import frappe
try:
    # Ensure we are on master site (explicit check/init if needed, but --site argument handles it mostly)
    if not frappe.db.exists('SaaS Tenant', '${subdomain}'):
        doc = frappe.new_doc('SaaS Tenant')
        doc.subdomain = '${subdomain}'
        doc.owner_email = '${adminEmail}'
        doc.site_url = 'http://${siteName}'
        doc.status = 'Active'
        doc.organization_name = '${organizationName}'
        doc.plan_type = '${planType}'
        doc.admin_user = '${adminEmail}'
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("SUCCESS: Tenant Registered.")
    else:
        # Upsert Logic
        doc = frappe.get_doc('SaaS Tenant', '${subdomain}')
        doc.site_url = 'http://${siteName}'
        doc.status = 'Active'
        doc.plan_type = '${planType}'
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        print("SUCCESS: Tenant Updated.")
except Exception as e:
    print(f"ERROR: Failed to register tenant: {e}")
`
            const cleanRegisterScript = registerScript.trim()
            const tempFilePath = `/tmp/register_tenant_${subdomain}.py`

            await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${tempFilePath} <<EOF
${cleanRegisterScript}
EOF"`)

            const regOutput = await runCommand(`docker exec -w ${WORK_DIR} ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${MASTER_SITE} console < ${tempFilePath}"`)
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${tempFilePath}`)

            if (regOutput.includes("SUCCESS")) console.log(`[Provisioning] Tenant registered/updated in Master DB (${MASTER_SITE}).`)
            else console.error(`[Provisioning] Failed to register tenant in Master DB.`)

            return {
                success: true,
                siteName,
                url: `http://${siteName}`,
                adminPassword: adminPass
            }

        } catch (regError) {
            console.error(`[Provisioning] Failed to register tenant in Master DB:`, regError)
            return {
                success: true,
                siteName,
                url: `http://${siteName}`,
                adminPassword: adminPass
            }
        }

    } catch (error) {
        console.error(`[Provisioning] Failed to provision ${siteName}`, error)
        return { success: false, error }
    }
}

// Allow running directly via CLI
if (require.main === module) {
    const args = process.argv.slice(2)
    if (args.length < 2) {
        console.log('Usage: ts-node provision-tenant.ts "Org Name" "admin@example.com"')
        process.exit(1)
    }
    provisionTenant({
        organizationName: args[0],
        adminEmail: args[1],
        planType: (args[2] as any) || 'Free'
    }).then(console.log).catch(console.error)
}
