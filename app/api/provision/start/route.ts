import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { provisionTenantSite, ProvisioningError } from '@/lib/provisioning-client'
import { createJob, completeJob, failJob, pruneJobs } from '@/app/lib/provision-jobs'
import { sendWorkspaceReadyEmail } from '@/lib/email'
import { normalizePlan, toProvisioningPlanType } from '@/types/subscription'
import { retrieveStripeCheckoutSession } from '@/lib/subscription/stripe'
import { syncSubscriptionFromSaasTenant } from '@/lib/subscription/master'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * POST /api/provision/start
 *
 * Reads the pending_tenant_data cookie, creates a background provisioning job,
 * and returns immediately with { jobId }. The client then polls
 * /api/provision/status?jobId=xxx for completion.
 *
 * This pattern avoids proxy read-timeout errors (Nginx default 60s) that
 * would kill a synchronous server action waiting 5-10 min for provisioning.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const pending = cookieStore.get('pending_tenant_data')?.value

  if (!pending) {
    return NextResponse.json(
      { error: 'No pending signup found. Please restart the signup process.' },
      { status: 400 },
    )
  }

  let data: {
    email: string
    password: string
    fullName: string
    organizationName: string
    subdomain: string
    plan: string
    plan_type?: 'Free' | 'Pro' | 'Enterprise'
    payment_status?: string
  }

  try {
    data = JSON.parse(pending)
  } catch {
    return NextResponse.json(
      { error: 'Invalid signup data. Please restart the signup process.' },
      { status: 400 },
    )
  }

  const plan = normalizePlan(data.plan_type || data.plan)
  let stripeCustomerId: string | undefined
  let stripeSubscriptionId: string | undefined

  if (plan !== 'free') {
    const body = await req.json().catch(() => ({})) as { checkout_session_id?: string }
    const checkoutSessionId =
      body.checkout_session_id ||
      req.nextUrl.searchParams.get('checkout_session_id') ||
      cookieStore.get('pending_stripe_checkout_session')?.value

    if (!checkoutSessionId) {
      return NextResponse.json(
        { error: 'Payment confirmation is required before provisioning this plan.' },
        { status: 402 },
      )
    }

    const session = await retrieveStripeCheckoutSession(checkoutSessionId)
    if (
      session.payment_status !== 'paid' ||
      session.metadata?.subdomain !== data.subdomain ||
      normalizePlan(session.metadata?.plan) !== plan
    ) {
      return NextResponse.json(
        { error: 'Stripe checkout session is not paid or does not match this signup.' },
        { status: 402 },
      )
    }

    stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined
    stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined
  }

  pruneJobs()

  // Returns an existing pending job if one is already running for this subdomain
  // (handles page refresh without re-triggering provisioning)
  const job = createJob(data.subdomain, data.email)

  // Only kick off provisioning if the job was freshly created
  // (startedAt within 2s of now = new job, not existing one)
  const isNewJob = Date.now() - job.startedAt < 2000
  if (isNewJob) {
    console.log(`[ProvisionStart] Starting background job ${job.id} for ${data.subdomain}`)

    // Fire-and-forget — provisioning runs in background while we return immediately
    provisionTenantSite({
      organization_name: data.organizationName,
      admin_email: data.email,
      admin_password: data.password,
      admin_full_name: data.fullName,
      plan_type: toProvisioningPlanType(plan),
      confirmed_plan_type: toProvisioningPlanType(plan),
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    })
      .then(async result => {
        const redirectUrl = IS_PROD
          ? `https://${result.subdomain}.${ROOT_DOMAIN}/dashboard`
          : `http://${result.subdomain}.localhost:3000/dashboard`

        if (result.success) {
          await syncSubscriptionFromSaasTenant({
            subdomain: data.subdomain,
            source: plan === 'free' ? 'saas_tenant' : 'stripe',
            statusOverride: plan === 'free' ? 'trial' : 'active',
            changedBy: 'provisioning',
            reason: 'provisioning_completed',
          }).catch((syncErr) => {
            console.warn('[ProvisionStart] Plan mirror sync failed:', syncErr)
          })

          // Send workspace ready email notification
          try {
            const loginUrl = IS_PROD
              ? `https://${result.subdomain}.${ROOT_DOMAIN}/login`
              : `http://${result.subdomain}.localhost:3000/login`

            const subdomainDisplay = IS_PROD
              ? `${result.subdomain}.${ROOT_DOMAIN}`
              : `${result.subdomain}.localhost:3000`

            await sendWorkspaceReadyEmail({
              userName: data.fullName,
              userEmail: data.email,
              workspaceName: data.organizationName,
              subdomain: subdomainDisplay,
              loginUrl,
            })
            console.log(`[ProvisionStart] ✉️  Workspace ready email sent to ${data.email}`)
          } catch (emailErr) {
            // Don't fail the job if email fails — provisioning succeeded
            console.warn(`[ProvisionStart] Failed to send workspace ready email:`, emailErr)
          }

          completeJob(job.id, {
            redirectUrl,
            apiKey: result.api_key,
            apiSecret: result.api_secret,
          })
          console.log(`[ProvisionStart] Job ${job.id} completed ✓ → ${redirectUrl}`)
        } else {
          failJob(job.id, result.error || 'Provisioning failed')
          console.error(`[ProvisionStart] Job ${job.id} failed:`, result.error)
        }
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof ProvisioningError ? err.message
          : err instanceof Error ? err.message
          : 'Unexpected error during provisioning'
        failJob(job.id, msg)
        console.error(`[ProvisionStart] Job ${job.id} threw:`, msg)
      })
  } else {
    console.log(`[ProvisionStart] Returning existing job ${job.id} for ${data.subdomain}`)
  }

  return NextResponse.json({ jobId: job.id, subdomain: data.subdomain })
}
