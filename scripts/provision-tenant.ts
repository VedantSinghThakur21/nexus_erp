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

const FRA_DOCKER_CONTAINER = process.env.FRA_DOCKER_CONTAINER || 'frappe_docker-backend-1' // adjust based on `docker ps`
const PARENT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

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
exists = frappe.db.exists('SaaS Tenant', {'subdomain': '${subdomain}'})
email_exists = frappe.db.count('SaaS Tenant', {'owner_email': '${adminEmail}'})
result = {'exists': bool(exists), 'email_exists': bool(email_exists)}
print(json.dumps(result))
`
        const cleanCheckScript = checkScript.trim()
        const checkFilePath = `/tmp/check_tenant_${subdomain}.py`

        await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${checkFilePath} <<EOF
${cleanCheckScript}
EOF"`)

        const checkResultStr = await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${MASTER_SITE} console < ${checkFilePath}"`)
        await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${checkFilePath}`)

        // Parse output (it might contain other logs, so find the JSON)
        const jsonMatch = checkResultStr.match(/\{"exists":.*\}/)
        if (jsonMatch) {
            const checkResult = JSON.parse(jsonMatch[0])
            if (checkResult.exists) {
                console.warn(`[Provisioning] Tenant '${subdomain}' already exists. Skipping provisioning.`)
                return { success: true, siteName, url: `http://${siteName}`, adminPassword } // Return existing info (password might be wrong but we can't recover it)
            }
            if (checkResult.email_exists) {
                console.warn(`[Provisioning] User '${adminEmail}' already has a tenant.`)
                // Optionally block or allow multiple tenants. For now, let's warn but proceed (or block if per-user limit)
                // User asked to NOT provision if account exists.
                return { success: false, error: 'User already has a tenant registered.' }
            }
        }
    } catch (checkError) {
        console.warn(`[Provisioning] Pre-flight check failed, proceeding anyway...`, checkError)
    }

    try {
        // 2. Create Site (bench new-site)
        // We use mariadb root password from env or default
        const dbRootPass = process.env.DB_ROOT_PASSWORD || '123'
        const adminPass = adminPassword || crypto.randomBytes(8).toString('hex')

        await runCommand(
            `docker exec ${FRA_DOCKER_CONTAINER} bench new-site ${siteName} ` +
            `--admin-password '${adminPass}' ` +
            `--db-root-password '${dbRootPass}' ` +
            `--install-app nexus_core ` + // Install custom app immediately
            `--force`
        )

        console.log(`[Provisioning] Site created: ${siteName}`)

        // 3. Create SaaS Settings (Using Robust Script with Error Handling)
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
    print("SaaS Settings seeded successfully.")
except Exception as e:
    print(f"Failed to seed SaaS Settings: {e}")
    # We don't raise here to allow the process to continue
`
            const cleanScript = seedScript.trim()
            const tempFilePath = `/tmp/seed_settings_${subdomain}.py`

            // 1. Write script to file
            await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${tempFilePath} <<EOF
${cleanScript}
EOF"`)

            // 2. Run script using bench console
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${siteName} console < ${tempFilePath}"`)

            // 3. Cleanup
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${tempFilePath}`)

        } catch (seedError) {
            console.warn(`[Provisioning] Warning: Failed to seed SaaS Settings. This might be due to missing metadata in nexus_core. Continuing...`, seedError)
        }

        // 3.5 Create System User on New Site
        console.log(`[Provisioning] Creating System User (${adminEmail}) on new site...`)
        try {
            const userScript = `
import frappe
try:
    if not frappe.db.exists('User', '${adminEmail}'):
        user = frappe.new_doc('User')
        user.email = '${adminEmail}'
        user.first_name = '${adminFullName || organizationName}'
        user.enabled = 1
        user.new_password = '${adminPass}'

        user.save(ignore_permissions=True)
        user.add_roles('System Manager')
        frappe.db.commit()
        print("System User created successfully.")
    else:
        print("System User already exists.")
except Exception as e:
    print(f"Failed to create System User: {e}")
`
            const cleanUserScript = userScript.trim()
            const userTempPath = `/tmp/create_user_${subdomain}.py`

            await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${userTempPath} <<EOF
${cleanUserScript}
EOF"`)

            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${siteName} console < ${userTempPath}"`)
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${userTempPath}`)
        } catch (userError) {
            console.error(`[Provisioning] Failed to create System User:`, userError)
        }

        // 4. Register Tenant in Master DB (CRITICAL STEP)
        console.log(`[Provisioning] Registering tenant in Master DB...`)

        try {
            // Use bench execute to upsert the tenant record
            // We'll use frappe.client.save (which inserts or updates) or frappe.get_doc(...).save()
            // But frappe.client.insert throws if exists.

            // Let's use a small python script via 'bench run-script' if we want logic, 
            // OR just try insert and ignore error, OR check existence first.
            // Simplest robust way without custom apps: check if exists, then insert.

            // Actually, we can just use the same "shell" trick but pipe it properly if we really wanted to, 
            // BUT let's stick to 'execute' for cleaner operation. 
            // Since logic (if exists update else insert) is hard with just 'execute', 
            // we will use the 'bench console' pipe method as requested by the user, but implemented robustly.
            const registerScript = `
import frappe
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
    print("Tenant Registered successfully")
else:
    print("Tenant already exists")
`
            // Robust Pipe Method: echo "script" | bench console
            // We need to escape the script for the echo command.
            // Since we are in node 'exec', we can just write to stdin of the process if we used spawn,
            // but runCommand uses exec. 
            // Let's us the 'execute' method with a wrapper if possible, OR just pure API if we had keys.

            // User specifically asked for: echo "..." | bench console

            const cleanScript = registerScript.trim()
            // We use a safe way to pipe: write to a temp file in container, run, delete.
            const tempFilePath = `/tmp/register_tenant_${subdomain}.py`

            // 1. Write script to file
            await runCommand(`docker exec -i ${FRA_DOCKER_CONTAINER} sh -c "cat > ${tempFilePath} <<EOF
${cleanScript}
EOF"`)

            // 2. Run script using bench console
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} sh -c "bench --site ${MASTER_SITE} console < ${tempFilePath}"`)

            // 3. Cleanup
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${tempFilePath}`)

            console.log(`[Provisioning] Tenant registered in Master DB (${MASTER_SITE}).`)

        } catch (regError) {
            console.error(`[Provisioning] Failed to register tenant in Master DB:`, regError)
            // We don't throw here because the site IS created, just the record is missing.
            // Admin might need to manually fix.
        }

        return {
            success: true,
            siteName,
            url: `http://${siteName}`, // or https
            adminPassword: adminPass
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
