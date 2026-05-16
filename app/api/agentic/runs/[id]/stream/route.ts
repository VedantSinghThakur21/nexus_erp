/**
 * Alias for BullMQ agent job SSE — same contract as `GET /api/agent/jobs/[id]/stream`.
 * Lets product code use the `/api/agentic/runs/.../stream` naming from the performance spec.
 */
import { headers } from 'next/headers'
import { requireAuth } from '@/app/api/_lib/auth'
import { createBullmqAgentJobSseResponse } from '@/lib/agent/bullmq-job-sse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function tenantFromHeaders(): Promise<string> {
  const h = await headers()
  return (h.get('x-tenant-id') || '').trim() || 'master'
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

  const { id } = await context.params
  if (!id) return new Response(JSON.stringify({ error: 'missing_job_id' }), { status: 400 })

  const tenant = await tenantFromHeaders()
  return createBullmqAgentJobSseResponse({
    jobId: id,
    expectedTenantId: tenant,
    signal: request.signal,
  })
}
