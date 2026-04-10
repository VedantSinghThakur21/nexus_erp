#!/usr/bin/env node
/**
 * reset-all-tenants.ts
 * ====================
 * One-time clean-slate script — deletes ALL SaaS Tenant records from the
 * Frappe master database and deprovisions every live Frappe tenant site via
 * the provisioning service.
 *
 * ⚠️  IRREVERSIBLE. All ERPNext data on tenant sites will be lost.
 *
 * Usage:
 *   npm run reset:tenants -- --confirm
 *   # or dry-run (lists tenants without deleting):
 *   npm run reset:tenants -- --dry-run
 *
 * Direct run alternative:
 *   npx tsx scripts/reset-all-tenants.ts --dry-run
 *
 * Requirements:
 *   - .env.local must have ERP_NEXT_URL, ERP_API_KEY, ERP_API_SECRET, FRAPPE_SITE_NAME
 *   - PROVISIONING_SERVICE_URL and PROVISIONING_API_SECRET must be set
 *   - The provisioning service must be running
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Load .env.local manually (no dotenv dependency required) ─────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found. Run from the project root.')
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

// ── Config ───────────────────────────────────────────────────────────────────
const ERP_URL           = process.env.ERP_NEXT_URL            || 'http://127.0.0.1:8080'
const ERP_API_KEY       = process.env.ERP_API_KEY             || ''
const ERP_API_SECRET    = process.env.ERP_API_SECRET          || ''
const MASTER_SITE       = process.env.FRAPPE_SITE_NAME        || 'erp.localhost'
const PROV_URL          = process.env.PROVISIONING_SERVICE_URL || 'http://localhost:8001'
const PROV_SECRET       = process.env.PROVISIONING_API_SECRET || ''

// ── Flags ────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const CONFIRM = args.includes('--confirm')

if (!DRY_RUN && !CONFIRM) {
  console.error(`
⛔  Safety check failed.

You must pass one of:
  --dry-run    List all tenants that would be deleted without actually deleting.
  --confirm    Proceed with PERMANENT deletion of all tenants and their data.

Example:
  npm run reset:tenants -- --dry-run
  npm run reset:tenants -- --confirm
`)
  process.exit(1)
}

if (!ERP_API_KEY || !ERP_API_SECRET) {
  console.error('❌  ERP_API_KEY and/or ERP_API_SECRET not set in .env.local')
  process.exit(1)
}

// ── Helper: Frappe master request ─────────────────────────────────────────────
async function masterFrappe(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, unknown>
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
    'X-Frappe-Site-Name': MASTER_SITE,
    'Accept': 'application/json',
  }

  let url = `${ERP_URL}/api/method/${endpoint}`

  if (method === 'GET' && body) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) {
        params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
      }
    }
    url += `?${params}`
  } else if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
  })

  const data: any = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      data?._server_messages
        ? JSON.parse(JSON.parse(data._server_messages)[0]).message
        : data?.message || `HTTP ${res.status}`
    )
  }
  return data.message ?? data.data ?? data
}

// ── Helper: Provisioning service ──────────────────────────────────────────────
async function provisioningDelete(subdomain: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${PROV_URL}/api/v1/deprovision/${encodeURIComponent(subdomain)}`, {
    method: 'DELETE',
    headers: {
      'X-Provisioning-Secret': PROV_SECRET,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(120_000),
  })
  const data: any = await res.json().catch(() => ({}))
  return { success: res.ok, message: data.message || data.detail || `HTTP ${res.status}` }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  Nexus ERP — Tenant Clean-Slate Reset')
  console.log('═══════════════════════════════════════════')
  console.log(`  ERP URL      : ${ERP_URL}`)
  console.log(`  Master site  : ${MASTER_SITE}`)
  console.log(`  Prov service : ${PROV_URL}`)
  console.log(`  Mode         : ${DRY_RUN ? '🟡 DRY RUN (no deletions)' : '🔴 LIVE — DESTRUCTIVE'}`)
  console.log('═══════════════════════════════════════════\n')

  // Step 1: Fetch all SaaS Tenant records
  console.log('📋 Fetching all SaaS Tenant records from master DB …')
  let tenants: Array<{ name: string; subdomain: string; owner_email: string; status: string }> = []
  try {
    const result = await masterFrappe('frappe.client.get_list', 'GET', {
      doctype: 'SaaS Tenant',
      fields: JSON.stringify(['name', 'subdomain', 'owner_email', 'status']),
      limit_page_length: '500',
    }) as any[]
    tenants = Array.isArray(result) ? result : []
  } catch (err: any) {
    console.error('❌  Failed to fetch SaaS Tenants:', err.message)
    process.exit(1)
  }

  if (tenants.length === 0) {
    console.log('✅  No SaaS Tenant records found. Nothing to delete.')
    return
  }

  console.log(`\nFound ${tenants.length} tenant(s):\n`)
  for (const t of tenants) {
    console.log(`  • [${t.status.padEnd(8)}] ${t.subdomain} — ${t.owner_email}`)
  }
  console.log()

  if (DRY_RUN) {
    console.log('🟡 Dry-run complete. No records were modified.')
    return
  }

  // Step 2: Delete each tenant
  const results = { deprovisioned: 0, deprovisionFailed: 0, deleted: 0, deleteFailed: 0 }

  for (const tenant of tenants) {
    const subdomain = tenant.subdomain
    const docName   = tenant.name

    // 2a. Deprovision the Frappe site via the provisioning service
    process.stdout.write(`  🗑  Deprovisioning site "${subdomain}" … `)
    try {
      const deprovResult = await provisioningDelete(subdomain)
      if (deprovResult.success) {
        console.log(`✅  ${deprovResult.message}`)
        results.deprovisioned++
      } else {
        console.log(`⚠️  ${deprovResult.message} (continuing anyway)`)
        results.deprovisionFailed++
      }
    } catch (err: any) {
      console.log(`⚠️  Provisioning service error: ${err.message} (continuing)`)
      results.deprovisionFailed++
    }

    // 2b. Delete the SaaS Tenant record from master DB
    process.stdout.write(`  🗑  Deleting master DB record "${docName}" … `)
    try {
      await masterFrappe('frappe.client.delete', 'POST', {
        doctype: 'SaaS Tenant',
        name: docName,
      })
      console.log('✅  Deleted')
      results.deleted++
    } catch (err: any) {
      console.log(`❌  Failed: ${err.message}`)
      results.deleteFailed++
    }
  }

  // Step 3: Summary
  console.log('\n═══════════════════════════════════════════')
  console.log('  Reset Summary')
  console.log('═══════════════════════════════════════════')
  console.log(`  Sites deprovisioned   : ${results.deprovisioned}`)
  console.log(`  Deprovision failures  : ${results.deprovisionFailed}`)
  console.log(`  DB records deleted    : ${results.deleted}`)
  console.log(`  DB delete failures    : ${results.deleteFailed}`)
  console.log('═══════════════════════════════════════════')

  if (results.deleteFailed > 0 || results.deprovisionFailed > 0) {
    console.log('\n⚠️  Some operations failed. Review the output above.')
    process.exit(2)
  } else {
    console.log('\n✅  All tenants deleted. System is on a clean slate.')
  }
}

main().catch((err) => {
  console.error('💥  Unexpected error:', err)
  process.exit(1)
})
