import { syncSubscriptionFromSaasTenant, masterFrappeCall, type SaasTenantRow } from '@/lib/subscription/master'

async function main() {
  const tenants = await masterFrappeCall<SaasTenantRow[]>('frappe.client.get_list', {
    doctype: 'SaaS Tenant',
    fields: [
      'name',
      'subdomain',
      'company_name',
      'organization_name',
      'owner_email',
      'plan_type',
      'subscription_status',
      'status',
      'stripe_customer_id',
      'stripe_subscription_id',
    ],
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

