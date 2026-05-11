#!/usr/bin/env npx tsx
/**
 * Set paid plan on a workspace (SaaS Tenant + Organization mirror) on the master site.
 *
 * Usage (from repo root):
 *   npx tsx scripts/set-tenant-plan.ts <subdomain> <pro|enterprise> [status]
 *   npm run subscription:set-plan -- testorg pro
 *
 * Requires .env.local: ERP_NEXT_URL, ERP_API_KEY, ERP_API_SECRET, FRAPPE_SITE_NAME
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import {
  normalizePlan,
  normalizeSubscriptionStatus,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/types/subscription'
import { updateSaasTenantPlan } from '@/lib/subscription/master'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const subdomain = process.argv[2]
  const planRaw = process.argv[3]
  const statusRaw = process.argv[4]

  if (!subdomain || !planRaw) {
    console.error('Usage: npx tsx scripts/set-tenant-plan.ts <subdomain> <pro|enterprise> [status]')
    console.error('Example: npx tsx scripts/set-tenant-plan.ts testorg pro')
    console.error('        npx tsx scripts/set-tenant-plan.ts testorg enterprise active')
    process.exit(1)
  }

  const plan = normalizePlan(planRaw) as SubscriptionTier
  if (plan !== 'pro' && plan !== 'enterprise') {
    console.error('Plan must be pro or enterprise.')
    process.exit(1)
  }

  const status = normalizeSubscriptionStatus(statusRaw || 'active') as SubscriptionStatus

  await updateSaasTenantPlan({
    subdomain,
    plan,
    status,
    source: 'manual',
    changedBy: 'scripts/set-tenant-plan.ts',
    reason: 'cli_manual_plan',
  })

  console.log(`OK — ${subdomain} is now ${plan} (${status}) on master (SaaS Tenant + Organization).`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
