import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireAuth } from '@/app/api/_lib/auth'
import { createStripePortalSession } from '@/lib/subscription/stripe'
import { getSaasTenantBySubdomain } from '@/lib/subscription/master'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

  try {
    const headersList = await headers()
    const subdomain = headersList.get('x-tenant-id')
    if (!subdomain || subdomain === 'master') {
      return NextResponse.json({ error: 'Billing portal is only available for tenant workspaces.' }, { status: 400 })
    }

    const tenant = await getSaasTenantBySubdomain(subdomain)
    if (!tenant?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer is linked to this tenant.' }, { status: 404 })
    }

    const returnUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
      : `${request.nextUrl.origin}/settings/billing`

    const session = await createStripePortalSession({
      customerId: tenant.stripe_customer_id,
      returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create billing portal session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

