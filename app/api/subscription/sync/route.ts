import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireAuth } from '@/app/api/_lib/auth'
import { syncSubscriptionFromSaasTenant } from '@/lib/subscription/master'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json().catch(() => ({})) as { subdomain?: string }
    const headersList = await headers()
    const subdomain = body.subdomain || headersList.get('x-tenant-id')

    if (!subdomain || subdomain === 'master') {
      return NextResponse.json({ error: 'A tenant subdomain is required for subscription sync.' }, { status: 400 })
    }

    const result = await syncSubscriptionFromSaasTenant({
      subdomain,
      source: 'manual',
      changedBy: auth.userEmail,
      reason: 'manual_subscription_sync',
    })

    return NextResponse.json({
      ok: true,
      plan: result.plan,
      status: result.status,
      tenant: result.tenant,
      organization: result.organization,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Subscription sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

