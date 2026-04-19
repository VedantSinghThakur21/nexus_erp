import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/app/lib/provision-jobs'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * GET /api/provision/status?jobId=xxx
 *
 * Returns the current state of a background provisioning job.
 * On success, writes the full tenant session cookie set so the redirect into
 * the new subdomain behaves identically to a fresh login (no leaked identity
 * cookies from a prior tenant on the same root domain).
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 })
  }

  const job = getJob(jobId)
  if (!job) {
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

  // Cookie attributes shared by every cookie we write here. We deliberately use
  // the parent domain in production so the cookies are visible on the tenant
  // subdomain we're about to redirect to.
  const cookieOptions = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    domain: IS_PROD ? `.${ROOT_DOMAIN}` : undefined,
  }

  const tenantSiteUrl = IS_PROD
    ? `https://${job.subdomain}.${ROOT_DOMAIN}`
    : `http://${job.subdomain}.localhost:3000`

  const res = NextResponse.json({
    done: true,
    success: true,
    redirectUrl: job.redirectUrl,
    subdomain: job.subdomain,
    elapsed,
  })

  // 1) Tenant API credentials (already produced by the provisioning service for
  //    the freshly-created admin user). All API calls authenticated as this
  //    user from now on use these.
  if (job.apiKey) res.cookies.set('tenant_api_key', job.apiKey, cookieOptions)
  if (job.apiSecret) res.cookies.set('tenant_api_secret', job.apiSecret, cookieOptions)

  // 2) Tenant identity cookies — must match what login writes, otherwise
  //    user_email / tenant_subdomain / tenant_role_type from a previous tenant
  //    leak into the new subdomain and cause 404 on User lookup and 403 on
  //    DocType list calls.
  res.cookies.set('user_email', job.email, cookieOptions)
  res.cookies.set('user_id', job.email, cookieOptions)
  res.cookies.set('tenant_subdomain', job.subdomain, cookieOptions)
  res.cookies.set('tenant_site_url', tenantSiteUrl, cookieOptions)
  res.cookies.set('user_type', 'tenant', cookieOptions)
  // Owner is always provisioned with System Manager — record that for the
  // role-repair self-heal path in app/lib/api.ts.
  res.cookies.set('tenant_role_type', 'admin', cookieOptions)

  // 3) Cleanup: a stale `sid` from a previous tenant on the same root domain
  //    will be sent to the new tenant and trigger Frappe's `session_expired:1`
  //    response, which our API client surfaces as a SESSION_EXPIRED error.
  //    The new tenant has no browser session yet — kill it.
  res.cookies.set('sid', '', { ...cookieOptions, maxAge: 0 })
  res.cookies.delete('pending_tenant_data')

  return res
}
