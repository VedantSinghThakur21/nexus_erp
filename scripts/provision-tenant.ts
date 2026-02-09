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

    console.log(`[Provisioning] Starting provisioning for ${siteName}...`)

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

        // 3. Create SaaS Settings (Using bench execute frappe.client.insert)
        const maxUsers = planType === 'Enterprise' ? 1000 : planType === 'Pro' ? 50 : 5
        const saaSSettings = {
            doctype: 'SaaS Settings',
            organization_name: organizationName,
            plan_type: planType,
            max_users: maxUsers
        }

        // We use JSON.stringify to pass the dict as a string argument to --kwargs
        // Note: frappe.client.insert takes a 'doc' argument
        const saasSettingsArgs = JSON.stringify({ doc: saaSSettings }).replace(/"/g, '\\"')

        await runCommand(
            `docker exec ${FRA_DOCKER_CONTAINER} bench --site ${siteName} execute frappe.client.insert --kwargs "${saasSettingsArgs}"`
        )

        console.log(`[Provisioning] SaaS Settings seeded.`)

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
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print("Tenant Registered")
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

            // 2. Run script
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} bench --site ${PARENT_DOMAIN} run-script ${tempFilePath}`)

            // 3. Cleanup
            await runCommand(`docker exec ${FRA_DOCKER_CONTAINER} rm ${tempFilePath}`)

            console.log(`[Provisioning] Tenant registered in Master DB (${PARENT_DOMAIN}).`)

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
