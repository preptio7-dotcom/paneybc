import { Redis } from '@upstash/redis'

type CounterResult = {
  count: number
  retryAfterSeconds: number
}

type MemoryEntry = {
  value: string
  expiresAt: number
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null

const memoryStore = new Map<string, MemoryEntry>()

function nowMs() {
  return Date.now()
}

function readMemoryEntry(key: string) {
  const current = memoryStore.get(key)
  if (!current) return null
  if (current.expiresAt <= nowMs()) {
    memoryStore.delete(key)
    return null
  }
  return current
}

export async function incrementCounterWithWindow(
  key: string,
  windowSeconds: number
): Promise<CounterResult> {
  if (redis) {
    try {
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, windowSeconds)
      }
      const ttl = await redis.ttl(key)
      return {
        count,
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
      }
    } catch {
      // fall through to in-memory fallback
    }
  }

  const current = readMemoryEntry(key)
  if (!current) {
    memoryStore.set(key, {
      value: '1',
      expiresAt: nowMs() + windowSeconds * 1000,
    })
    return { count: 1, retryAfterSeconds: windowSeconds }
  }

  const nextCount = Number(current.value || '0') + 1
  memoryStore.set(key, {
    value: String(nextCount),
    expiresAt: current.expiresAt,
  })

  return {
    count: nextCount,
    retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - nowMs()) / 1000)),
  }
}

export async function setSecurityKey(key: string, value: string, ttlSeconds: number) {
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds })
      return
    } catch {
      // fall through
    }
  }

  memoryStore.set(key, {
    value,
    expiresAt: nowMs() + ttlSeconds * 1000,
  })
}

export async function getSecurityKey(key: string): Promise<string | null> {
  if (redis) {
    try {
      const value = await redis.get<string>(key)
      return value ? String(value) : null
    } catch {
      // fall through
    }
  }

  const current = readMemoryEntry(key)
  return current?.value || null
}

export async function getSecurityKeyTtl(key: string): Promise<number> {
  if (redis) {
    try {
      const ttl = await redis.ttl(key)
      return ttl > 0 ? ttl : 0
    } catch {
      // fall through
    }
  }

  const current = readMemoryEntry(key)
  if (!current) return 0
  return Math.max(0, Math.ceil((current.expiresAt - nowMs()) / 1000))
}

export async function deleteSecurityKey(key: string) {
  if (redis) {
    try {
      await redis.del(key)
      return
    } catch {
      // fall through
    }
  }

  memoryStore.delete(key)
}
