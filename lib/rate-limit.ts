import Redis from 'ioredis'

let redis: Redis | null = null
/** After a connection failure, skip Redis for this process to avoid log spam. */
let redisUnavailable = false

function isRedisConfigured(): boolean {
  const url = process.env.REDIS_URL?.trim()
  if (!url || url === 'false' || url === 'disabled' || url === 'off') return false
  return true
}

function getRedis(): Redis | null {
  if (redisUnavailable || !isRedisConfigured()) return null

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      connectTimeout: 2_000,
    })
    redis.on('error', () => {
      redisUnavailable = true
      try {
        redis?.disconnect()
      } catch {
        // ignore
      }
      redis = null
    })
  }
  return redis
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRedis()
  if (!client) {
    return { allowed: true, remaining: limit }
  }

  const now = Date.now()
  const window = Math.floor(now / windowMs)
  const redisKey = `rl:${key}:${window}`

  try {
    if (client.status === 'wait' || client.status === 'end') {
      await client.connect()
    }
    const count = await client.incr(redisKey)
    if (count === 1) {
      await client.pexpire(redisKey, windowMs)
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch {
    redisUnavailable = true
    try {
      client.disconnect()
    } catch {
      // ignore
    }
    redis = null
    return { allowed: true, remaining: limit }
  }
}
