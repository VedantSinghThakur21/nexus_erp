import { createHmac, timingSafeEqual } from 'crypto'
import { normalizePlan, type SubscriptionTier } from '@/types/subscription'

export type StripeCheckoutSession = {
  id: string
  url?: string
  customer?: string
  subscription?: string
  metadata?: Record<string, string>
  payment_status?: string
}

export type StripeSubscription = {
  id: string
  customer?: string
  status?: string
  items?: {
    data?: Array<{
      price?: {
        id?: string
      }
    }>
  }
  metadata?: Record<string, string>
}

export function getStripePriceId(plan: SubscriptionTier): string | null {
  if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID || null
  if (plan === 'enterprise') return process.env.STRIPE_ENTERPRISE_PRICE_ID || null
  return null
}

/** Human-readable hint for operators when checkout env is missing. */
export function missingStripePriceEnvMessage(plan: SubscriptionTier): string {
  if (plan === 'pro') {
    return (
      `Stripe Price ID for "${plan}" is not set. Add STRIPE_PRO_PRICE_ID to the server environment ` +
      `(Stripe Dashboard → Product catalog → your Pro subscription price → copy the Price ID, e.g. price_…).`
    )
  }
  if (plan === 'enterprise') {
    return (
      `Stripe Price ID for "${plan}" is not set. Add STRIPE_ENTERPRISE_PRICE_ID to the server environment ` +
      `(same as Pro: use the Enterprise recurring price’s API ID).`
    )
  }
  return `Stripe Price ID is not configured for plan "${plan}".`
}

export function getPlanFromStripePriceId(priceId?: string): SubscriptionTier {
  if (priceId && priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return 'enterprise'
  if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  return 'free'
}

export function getStripePlanFromInput(raw: unknown): SubscriptionTier {
  const plan = normalizePlan(raw)
  if (plan === 'free') throw new Error('Free plan does not require Stripe checkout')
  return plan
}

async function stripeRequest<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('STRIPE_SECRET_KEY is not configured')

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${secret}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })

  const data = await response.json().catch(() => ({})) as { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe request failed with status ${response.status}`)
  }

  return data as T
}

export async function createStripeCheckoutSession(input: {
  plan: SubscriptionTier
  customerEmail: string
  subdomain: string
  organizationName: string
  successUrl: string
  cancelUrl: string
}): Promise<StripeCheckoutSession> {
  const priceId = getStripePriceId(input.plan)
  if (!priceId) throw new Error(missingStripePriceEnvMessage(input.plan))

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('customer_email', input.customerEmail)
  params.set('line_items[0][price]', priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('success_url', input.successUrl)
  params.set('cancel_url', input.cancelUrl)
  params.set('metadata[subdomain]', input.subdomain)
  params.set('metadata[plan]', input.plan)
  params.set('metadata[organization_name]', input.organizationName)
  params.set('metadata[provision_after_payment]', 'true')
  params.set('subscription_data[metadata][subdomain]', input.subdomain)
  params.set('subscription_data[metadata][plan]', input.plan)

  return stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
}

export async function createStripePortalSession(input: {
  customerId: string
  returnUrl: string
}): Promise<{ id: string; url: string }> {
  const params = new URLSearchParams()
  params.set('customer', input.customerId)
  params.set('return_url', input.returnUrl)

  return stripeRequest<{ id: string; url: string }>('/billing_portal/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
}

export async function retrieveStripeCheckoutSession(id: string): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(id)}`, {
    method: 'GET',
  })
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key, value]
    })
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const signatureBuffer = Buffer.from(signature, 'hex')
  if (expectedBuffer.length !== signatureBuffer.length) return false

  return timingSafeEqual(expectedBuffer, signatureBuffer)
}

