import IORedis from 'ioredis'
import { Worker } from 'bullmq'
import { runAgent } from '../lib/agent/runner'
import { AgentFrappeClient } from '../lib/agent/frappe'
import { agentQueueName } from '../lib/agent/queue'
import type { AgentActionLogDoc, AgentJobPayload } from '../lib/agent/types'

const redisHost = process.env.FRAPPE_REDIS_HOST || '127.0.0.1'
const redisPort = Number(process.env.FRAPPE_REDIS_PORT || '6379')
const redisPassword = process.env.FRAPPE_REDIS_PASSWORD
const redisUrl = process.env.FRAPPE_REDIS_URL

const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : new IORedis({ host: redisHost, port: redisPort, password: redisPassword, maxRetriesPerRequest: null })

function getSiteName(tenantId: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  const isProd = process.env.NODE_ENV === 'production'
  const master = process.env.FRAPPE_SITE_NAME || 'erp.localhost'

  if (tenantId === 'master') return master
  return isProd ? `${tenantId}.${rootDomain}` : `${tenantId}.localhost`
}

async function writeActionLogs(payload: AgentJobPayload, result: Awaited<ReturnType<typeof runAgent>>) {
  const client = new AgentFrappeClient({ siteName: payload.tenant.siteName })

  for (const action of result.suggestedActions) {
    const doc: AgentActionLogDoc = {
      doctype: 'Agent Action Log',
      tenant: payload.tenant.tenantId,
      action_type: payload.jobType,
      status: 'pending_approval',
      triggered_by: payload.triggeredBy,
      payload: JSON.stringify({
        title: action.title,
        reason: action.reason,
        confidence: action.confidence,
        toolCall: action.toolCall,
      }),
      rolled_back: 0,
    }

    await client.insertDoc(doc as unknown as Record<string, unknown>)
  }
}

const worker = new Worker<AgentJobPayload>(
  agentQueueName,
  async (job) => {
    const tenantId = job.data.tenant.tenantId
    const siteName = job.data.tenant.siteName || getSiteName(tenantId)

    const result = await runAgent(
      {
        jobType: job.data.jobType,
        objective: job.data.objective || `Generate safe suggestions for ${job.data.jobType}`,
      },
      {
        tenantId,
        siteName,
      }
    )

    await writeActionLogs(
      {
        ...job.data,
        tenant: { tenantId, siteName },
      },
      result
    )

    return { inserted: result.suggestedActions.length, summary: result.summary }
  },
  {
    connection,
    concurrency: 2,
  }
)

worker.on('completed', (job, value) => {
  console.log(`[agent-worker] completed job=${job.id}`, value)
})

worker.on('failed', (job, error) => {
  console.error(`[agent-worker] failed job=${job?.id}`, error)
})

console.log('[agent-worker] listening on queue:', agentQueueName)
