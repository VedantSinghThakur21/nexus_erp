import { exec } from 'child_process'
import { promisify } from 'util'
import * as crypto from 'crypto'

const execAsync = promisify(exec)

interface ProvisionOptions {
    organizationName: string
    adminEmail: string
    adminPassword?: string // Optional, can be generated
    planType?: 'Free' | 'Pro' | 'Enterprise'
}

const FRA_DOCKER_CONTAINER = 'frappe_docker-backend-1' // adjust based on `docker ps`
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

        // 3. Create SaaS Settings (Simulated via bench execute or API)
        // We'll use a python script via bench runner to seed data
        // Or we could use the API. Since we have a fresh site, API is cleaner if we had a key.
        // But we have the admin password!

        const maxUsers = planType === 'Enterprise' ? 1000 : planType === 'Pro' ? 50 : 5

        const seedScript = `
import frappe
doc = frappe.new_doc('SaaS Settings')
doc.organization_name = '${organizationName}'
doc.plan_type = '${planType}'
doc.max_users = ${maxUsers}
doc.insert(ignore_permissions=True)
frappe.db.commit()
    `

        await runCommand(
            `docker exec ${FRA_DOCKER_CONTAINER} bench --site ${siteName} shell --command "${seedScript.replace(/\n/g, ';')}"`
        )

        console.log(`[Provisioning] SaaS Settings seeded.`)

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
