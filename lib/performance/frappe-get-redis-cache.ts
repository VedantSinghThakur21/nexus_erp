/**
 * Optional Layer 2 — Redis cache for Frappe GET responses (multi-instance safe).
 * Enabled when FRAPPE_REDIS_URL or FRAPPE_REDIS_HOST is configured.
 */

import IORedis from 'ioredis'

const KEY_PREFIX = 'frappe-get:v1:'

let client: IORedis | null = null

function getRedis(): IORedis | null {
  const url = process.env.FRAPPE_REDIS_URL
  if (url) {
    if (!client) {
      client = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: false })
    }
    return client
  }

  const host = process.env.FRAPPE_REDIS_HOST
  if (!host) return null

  if (!client) {
    client = new IORedis({
      host,
      port: Number(process.env.FRAPPE_REDIS_PORT || '11000'),
      password: process.env.FRAPPE_REDIS_PASSWORD,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    })
  }
  return client
}

export async function readRedisFrappeGet(key: string): Promise<unknown | undefined> {
  const redis = getRedis()
  if (!redis) return undefined

  try {
    const raw = await redis.get(`${KEY_PREFIX}${key}`)
    if (!raw) return undefined
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export async function writeRedisFrappeGet(
  key: string,
  value: unknown,
  ttlMs: number,
): Promise<void> {
  const redis = getRedis()
  if (!redis || ttlMs <= 0) return

  try {
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000))
    await redis.setex(`${KEY_PREFIX}${key}`, ttlSec, JSON.stringify(value))
  } catch {
    // fail open — memory cache still applies
  }
}
