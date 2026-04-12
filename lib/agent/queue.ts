import IORedis from 'ioredis'
import { Queue } from 'bullmq'
import type { AgentJobPayload } from '@/lib/agent/types'

const redisHost = process.env.FRAPPE_REDIS_HOST || '127.0.0.1'
const redisPort = Number(process.env.FRAPPE_REDIS_PORT || '6379')
const redisPassword = process.env.FRAPPE_REDIS_PASSWORD
const redisUrl = process.env.FRAPPE_REDIS_URL

function getConnection() {
  if (redisUrl) {
    return new IORedis(redisUrl, { maxRetriesPerRequest: null })
  }

  return new IORedis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
  })
}

const connection = getConnection()

export const agentQueueName = 'agent-jobs'

export const agentQueue = new Queue<AgentJobPayload>(agentQueueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 200,
    removeOnFail: 500,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
})

export async function enqueueAgentJob(payload: AgentJobPayload) {
  return agentQueue.add(payload.jobType, payload)
}
