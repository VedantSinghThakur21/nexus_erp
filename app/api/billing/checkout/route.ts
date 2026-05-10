import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createStripeCheckoutSession, getStripePlanFromInput } from '@/lib/subscription/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PendingSignup = {
  email: string
  organizationName: string
  subdomain: string
  plan: string
}

function appUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { plan?: string }
    const cookieStore = await cookies()
    const pendingRaw = cookieStore.get('pending_tenant_data')?.value
    if (!pendingRaw) {
      return NextResponse.json({ error: 'No pending signup found. Please restart signup.' }, { status: 400 })
    }

    const pending = JSON.parse(pendingRaw) as PendingSignup
    const plan = getStripePlanFromInput(body.plan || pending.plan)
    if (plan !== pending.plan) {
      return NextResponse.json({ error: 'Selected plan does not match pending signup plan.' }, { status: 400 })
    }

    const baseUrl = appUrl(request)
    const session = await createStripeCheckoutSession({
      plan,
      customerEmail: pending.email,
      subdomain: pending.subdomain,
      organizationName: pending.organizationName,
      successUrl: `${baseUrl}/provisioning?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/signup?billing=cancelled`,
    })

    cookieStore.set('pending_stripe_checkout_session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    })

    return NextResponse.json({ url: session.url, id: session.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

