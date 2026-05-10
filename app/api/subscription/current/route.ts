import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireAuth } from '@/app/api/_lib/auth'
import { normalizePlan, normalizeSubscriptionStatus } from '@/types/subscription'
import { getSaasTenantBySubdomain, syncSubscriptionFromSaasTenant } from '@/lib/subscription/master'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

  try {
    const headersList = await headers()
    const tenantId =
      headersList.get('x-tenant-id') ||
      headersList.get('X-Subdomain') ||
      null
    const tenantMode = headersList.get('X-Tenant-Mode') || (tenantId === 'master' ? 'master' : null)

    if (tenantMode === 'master' || !tenantId || tenantId === 'master') {
      // On master site, return enterprise plan (admin access)
      return NextResponse.json({
        plan: 'enterprise',
        status: 'active',
        source: 'manual',
        tenant: null,
      })
    }

    const tenant = await getSaasTenantBySubdomain(tenantId)
    if (!tenant) {
      return NextResponse.json({
        plan: 'free',
        status: 'trial',
        source: 'saas_tenant',
        tenant: null,
      })
    }

    const synced = await syncSubscriptionFromSaasTenant({
      subdomain: tenantId,
      source: 'saas_tenant',
      changedBy: auth.userEmail || 'system',
      reason: 'subscription_current_read',
    })

    return NextResponse.json({
      plan: synced.plan,
      plan_type: tenant.plan_type,
      status: normalizeSubscriptionStatus(tenant.subscription_status || tenant.status || synced.status),
      source: 'saas_tenant',
      agentic_ai_enabled: !!synced.organization?.agentic_ai_enabled,
      stripe_customer_id: tenant.stripe_customer_id,
      stripe_subscription_id: tenant.stripe_subscription_id,
      tenant: {
        name: tenant.company_name || tenant.organization_name,
        subdomain: tenantId,
      },
    })

  } catch (error: unknown) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription', plan: normalizePlan(null) },
      { status: 500 }
    )
  }
}
