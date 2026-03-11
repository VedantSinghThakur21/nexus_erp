import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { provisionTenantSite, ProvisioningError } from '@/lib/provisioning-client'
import { createJob, completeJob, failJob, pruneJobs } from '@/app/lib/provision-jobs'

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
export async function POST(_req: NextRequest) {
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
  }

  try {
    data = JSON.parse(pending)
  } catch {
    return NextResponse.json(
      { error: 'Invalid signup data. Please restart the signup process.' },
      { status: 400 },
    )
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
      plan_type: data.plan as 'Free' | 'Pro' | 'Enterprise',
    })
      .then(result => {
        const redirectUrl = IS_PROD
          ? `https://${result.subdomain}.${ROOT_DOMAIN}/dashboard`
          : `http://${result.subdomain}.localhost:3000/dashboard`

        if (result.success) {
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
