import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/app/lib/provision-jobs'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * GET /api/provision/status?jobId=xxx
 *
 * Returns the current state of a background provisioning job.
 * When the job completes successfully, this endpoint also sets the tenant
 * API key cookies (httpOnly, domain-scoped) and clears the pending signup cookie.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 })
  }

  const job = getJob(jobId)
  if (!job) {
    // Job not found — typically happens after a server restart.
    // Tell the client so it can show a helpful recovery message.
    return NextResponse.json(
      {
        error: 'job_not_found',
        message:
          'The server was restarted while your workspace was being set up. ' +
          'Provisioning may still be running in the background. ' +
          'Please wait a few minutes, then try logging in.',
      },
      { status: 404 },
    )
  }

  const elapsed = Math.floor((Date.now() - job.startedAt) / 1000)

  if (job.status === 'pending') {
    return NextResponse.json({ done: false, elapsed, subdomain: job.subdomain })
  }

  if (job.status === 'error') {
    return NextResponse.json({
      done: true,
      success: false,
      error: job.error,
      subdomain: job.subdomain,
      elapsed,
    })
  }

  // ── Success: attach API key cookies and redirect info ──
  const cookieOptions = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    domain: IS_PROD ? `.${ROOT_DOMAIN}` : undefined,
  }

  const res = NextResponse.json({
    done: true,
    success: true,
    redirectUrl: job.redirectUrl,
    subdomain: job.subdomain,
    elapsed,
  })

  if (job.apiKey) res.cookies.set('tenant_api_key', job.apiKey, cookieOptions)
  if (job.apiSecret) res.cookies.set('tenant_api_secret', job.apiSecret, cookieOptions)
  res.cookies.delete('pending_tenant_data')

  return res
}
