import { headers } from 'next/headers'
import { getCachedSubscriptionRead } from '@/lib/subscription/cached-subscription-read'
import { normalizePlan } from '@/types/subscription'
import { BillingClient } from './billing-client'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') || headersList.get('X-Subdomain') || null
  const isMaster = !tenantId || tenantId === 'master'

  if (isMaster) {
    return (
      <BillingClient
        current={{
          tenant: null,
          plan: 'enterprise',
          status: 'active',
        }}
      />
    )
  }

  const snapshot = await getCachedSubscriptionRead(tenantId)
  if (!snapshot.found) {
    return (
      <BillingClient
        current={{
          tenant: { subdomain: tenantId },
          plan: 'free',
          status: 'trial',
        }}
      />
    )
  }

  return (
    <BillingClient
      current={{
        tenant: { name: snapshot.tenant.company_name, subdomain: tenantId },
        plan: normalizePlan(snapshot.tenant.plan_type),
        status: snapshot.synced.status,
        stripe_customer_id: snapshot.tenant.stripe_customer_id,
        stripe_subscription_id: snapshot.tenant.stripe_subscription_id,
      }}
    />
  )
}
