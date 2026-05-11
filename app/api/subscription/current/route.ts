import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireAuth } from '@/app/api/_lib/auth'
import { normalizePlan, normalizeSubscriptionStatus } from '@/types/subscription'
import { getCachedSubscriptionRead } from '@/lib/subscription/cached-subscription-read'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function withTimingHeaders(response: NextResponse, start: number): NextResponse {
  const ms = Math.round(performance.now() - start)
  response.headers.set('X-Response-Time', `${ms}ms`)
  return response
}

export async function GET() {
  const started = performance.now()
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
      const res = NextResponse.json({
        plan: 'enterprise',
        status: 'active',
        source: 'manual',
        tenant: null,
      })
      res.headers.set('Cache-Control', 'private, no-store')
      return withTimingHeaders(res, started)
    }

    const snapshot = await getCachedSubscriptionRead(tenantId)
    if (!snapshot.found) {
      const res = NextResponse.json({
        plan: 'free',
        status: 'trial',
        source: 'saas_tenant',
        tenant: null,
      })
      res.headers.set(
        'Cache-Control',
        'private, max-age=0, s-maxage=30, stale-while-revalidate=120'
      )
      return withTimingHeaders(res, started)
    }

    const { tenant, synced } = snapshot
    const res = NextResponse.json({
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
    res.headers.set(
      'Cache-Control',
      'private, max-age=0, s-maxage=30, stale-while-revalidate=120'
    )
    return withTimingHeaders(res, started)

  } catch (error: unknown) {
    console.error('Get subscription error:', error)
    const res = NextResponse.json(
      { error: 'Failed to fetch subscription', plan: normalizePlan(null) },
      { status: 500 }
    )
    return withTimingHeaders(res, started)
  }
}
