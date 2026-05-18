import Redis from 'ioredis'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    })
  }
  return redis
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now()
  const window = Math.floor(now / windowMs)
  const redisKey = `rl:${key}:${window}`

  try {
    const client = getRedis()
    if (client.status !== 'ready') {
      await client.connect().catch(() => undefined)
    }
    const count = await client.incr(redisKey)
    if (count === 1) {
      await client.pexpire(redisKey, windowMs)
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch {
    return { allowed: true, remaining: limit }
  }
}
