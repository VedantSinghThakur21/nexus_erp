import { syncSubscriptionFromSaasTenant, masterFrappeCall } from '@/lib/subscription/master'

async function main() {
  // Keep list fields minimal — master site may restrict columns on SaaS Tenant (e.g. plan_type).
  const tenants = await masterFrappeCall<{ name: string; subdomain?: string }[]>('frappe.client.get_list', {
    doctype: 'SaaS Tenant',
    fields: ['name', 'subdomain'],
    limit_page_length: 500,
  })

  let synced = 0
  let failed = 0

  for (const tenant of tenants) {
    const subdomain = tenant.subdomain || tenant.name
    if (!subdomain) continue

    try {
      const result = await syncSubscriptionFromSaasTenant({
        subdomain,
        source: 'saas_tenant',
        changedBy: 'backfill-script',
        reason: 'subscription_mirror_backfill',
      })
      synced += 1
      console.log(`[backfill] ${subdomain}: ${result.plan} / ${result.status}`)
    } catch (error) {
      failed += 1
      console.error(`[backfill] ${subdomain}: failed`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`[backfill] complete: synced=${synced} failed=${failed}`)
}

main().catch((error) => {
  console.error('[backfill] fatal:', error)
  process.exit(1)
})

