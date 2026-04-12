import { NextResponse } from 'next/server'
import { requireModuleAccess } from '@/app/api/_lib/auth'
import { enqueueAgentJob } from '@/lib/agent/queue'

function getTenantSiteName(tenant: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  const isProd = process.env.NODE_ENV === 'production'
  const master = process.env.FRAPPE_SITE_NAME || 'erp.localhost'

  if (!tenant || tenant === 'master') return master
  return isProd ? `${tenant}.${rootDomain}` : `${tenant}.localhost`
}

export async function POST(request: Request) {
  const auth = await requireModuleAccess('agent-inbox')
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json().catch(() => ({})) as { tenant?: string }
    const tenant = body.tenant || 'master'

    const job = await enqueueAgentJob({
      tenant: {
        tenantId: tenant,
        siteName: getTenantSiteName(tenant),
      },
      triggeredBy: auth.userEmail,
      jobType: 'stale_lead_scan',
      objective: 'Find stale leads and suggest one safe follow-up action for approval.',
    })

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enqueue scan'

    if (message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        {
          error: 'Redis is not reachable for agent queue. Set FRAPPE_REDIS_PORT (bench is often 11000) or FRAPPE_REDIS_URL.',
          details: message,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
