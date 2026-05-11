import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getPlanFromStripePriceId, verifyStripeWebhookSignature, type StripeCheckoutSession, type StripeSubscription } from '@/lib/subscription/stripe'
import { normalizePlan } from '@/types/subscription'
import { updateSaasTenantPlan } from '@/lib/subscription/master'

function bumpSubscriptionSnapshot(subdomain: string) {
  revalidateTag(`subscription:${subdomain}`, 'max')
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type StripeEvent = {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

function stripeStatusToSubscriptionStatus(status?: string) {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  if (status === 'canceled') return 'cancelled'
  return 'pending_payment'
}

async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  const subdomain = session.metadata?.subdomain
  const plan = normalizePlan(session.metadata?.plan)
  if (!subdomain || plan === 'free') return

  await updateSaasTenantPlan({
    subdomain,
    plan,
    status: 'active',
    source: 'stripe',
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
    stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
    changedBy: 'stripe:webhook',
    reason: 'checkout.session.completed',
  })
  bumpSubscriptionSnapshot(subdomain)
}

async function handleSubscriptionUpdated(subscription: StripeSubscription) {
  const subdomain = subscription.metadata?.subdomain
  if (!subdomain) return

  const priceId = subscription.items?.data?.[0]?.price?.id
  const plan = getPlanFromStripePriceId(priceId)
  await updateSaasTenantPlan({
    subdomain,
    plan,
    status: stripeStatusToSubscriptionStatus(subscription.status),
    source: 'stripe',
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : undefined,
    stripeSubscriptionId: subscription.id,
    changedBy: 'stripe:webhook',
    reason: 'customer.subscription.updated',
  })
  bumpSubscriptionSnapshot(subdomain)
}

async function handleSubscriptionDeleted(subscription: StripeSubscription) {
  const subdomain = subscription.metadata?.subdomain
  if (!subdomain) return

  await updateSaasTenantPlan({
    subdomain,
    plan: 'free',
    status: 'cancelled',
    source: 'stripe',
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : undefined,
    stripeSubscriptionId: subscription.id,
    changedBy: 'stripe:webhook',
    reason: 'customer.subscription.deleted',
  })
  bumpSubscriptionSnapshot(subdomain)
}

async function handleInvoicePaymentFailed(invoice: Record<string, unknown>) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : undefined
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : undefined
  const subdomain = typeof invoice.metadata === 'object' && invoice.metadata
    ? (invoice.metadata as Record<string, string>).subdomain
    : undefined

  // Best case: include subdomain in invoice/subscription metadata. Without it,
  // we avoid guessing and leave reconciliation to /api/subscription/sync.
  if (!subdomain) return

  await updateSaasTenantPlan({
    subdomain,
    plan: 'pro',
    status: 'past_due',
    source: 'stripe',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    changedBy: 'stripe:webhook',
    reason: 'invoice.payment_failed',
  })
  bumpSubscriptionSnapshot(subdomain)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!verifyStripeWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as StripeEvent

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object as StripeCheckoutSession)
    } else if (event.type === 'customer.subscription.updated') {
      await handleSubscriptionUpdated(event.data.object as StripeSubscription)
    } else if (event.type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(event.data.object as StripeSubscription)
    } else if (event.type === 'invoice.payment_failed') {
      await handleInvoicePaymentFailed(event.data.object)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed'
    console.error('[StripeWebhook] Failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

