import { headers } from 'next/headers'
import { requireAuth } from '@/app/api/_lib/auth'
import { getAgentQueue } from '@/lib/agent/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MS = 15 * 60 * 1000
const TICK_MS = 750

async function tenantFromHeaders(): Promise<string> {
  const h = await headers()
  return (h.get('x-tenant-id') || '').trim() || 'master'
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response

  const { id } = await context.params
  if (!id) return new Response(JSON.stringify({ error: 'missing_job_id' }), { status: 400 })

  const tenant = await tenantFromHeaders()

  let queue: ReturnType<typeof getAgentQueue>
  try {
    queue = getAgentQueue()
  } catch {
    return new Response(
      JSON.stringify({ error: 'agent_queue_unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const job = await queue.getJob(id).catch(() => null)
  if (!job) {
    return new Response(JSON.stringify({ error: 'job_not_found' }), { status: 404 })
  }

  const jobTenant = typeof job.data?.tenant?.tenantId === 'string' ? job.data.tenant.tenantId : ''
  if (jobTenant !== tenant) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        )
      }

      const deadline = Date.now() + MAX_MS

      send('snapshot', {
        mode: 'bullmq-agent-job',
      })

      try {
        while (Date.now() < deadline) {
          const current = await queue.getJob(id)
          if (!current) {
            send('error', { code: 'job_disappeared' })
            break
          }

          const state = await current.getState()
          const rawProgress = current.progress as unknown
          const progress =
            typeof rawProgress === 'number'
              ? rawProgress
              : rawProgress !== null &&
                  typeof rawProgress === 'object' &&
                  typeof (rawProgress as { percent?: unknown }).percent === 'number'
                ? (rawProgress as { percent: number }).percent
                : 0

          send('tick', {
            state,
            progress,
            attemptsMade: current.attemptsMade,
            processedOn: current.processedOn,
            timestamp: Date.now(),
          })

          if (state === 'completed') {
            send('completed', { returnvalue: current.returnvalue })
            break
          }
          if (state === 'failed') {
            send('failed', {
              failedReason: current.failedReason,
              attemptsMade: current.attemptsMade,
            })
            break
          }

          await new Promise((resolve) => setTimeout(resolve, TICK_MS))
        }
      } catch (error: unknown) {
        send('error', { code: 'stream_abort', message: error instanceof Error ? error.message : 'unknown' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
