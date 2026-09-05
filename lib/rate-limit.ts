import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

type RequestLike = { headers: Headers }

type LimitConfig = {
  scope: string
  maxRequests: number
  windowSeconds: number
}

type LimitResult = {
  allowed: boolean
  currentCount: number
  remaining: number
  retryAfterSeconds: number
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

const memoryStore = new Map<string, { count: number; resetAt: number }>()

export function getClientIp(request: RequestLike) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  return 'unknown'
}

const toResult = (count: number, maxRequests: number, retryAfterSeconds: number): LimitResult => ({
  allowed: count <= maxRequests,
  currentCount: count,
  remaining: Math.max(0, maxRequests - count),
  retryAfterSeconds: Math.max(1, retryAfterSeconds),
})

const useMemoryLimit = (key: string, maxRequests: number, windowSeconds: number): LimitResult => {
  const now = Date.now()
  const current = memoryStore.get(key)
  if (!current || now >= current.resetAt) {
    const resetAt = now + windowSeconds * 1000
    memoryStore.set(key, { count: 1, resetAt })
    return toResult(1, maxRequests, windowSeconds)
  }

  const nextCount = current.count + 1
  memoryStore.set(key, { ...current, count: nextCount })
  const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000)
  return toResult(nextCount, maxRequests, retryAfterSeconds)
}

export async function enforceIpRateLimit(request: RequestLike, config: LimitConfig): Promise<LimitResult> {
  const ip = getClientIp(request)
  const key = `rl:${config.scope}:${ip}`

  if (!redis) {
    return useMemoryLimit(key, config.maxRequests, config.windowSeconds)
  }

  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, config.windowSeconds)
    }
    const ttl = await redis.ttl(key)
    return toResult(count, config.maxRequests, ttl > 0 ? ttl : config.windowSeconds)
  } catch (error) {
    // Fall back to in-memory limiter if Redis is unavailable.
    return useMemoryLimit(key, config.maxRequests, config.windowSeconds)
  }
}

export function rateLimitExceededResponse(scope: string, retryAfterSeconds: number) {
  const response = NextResponse.json(
    {
      error: `Too many requests for ${scope}. Please try again later.`,
      retryAfterSeconds,
    },
    { status: 429 }
  )
  response.headers.set('Retry-After', String(retryAfterSeconds))
  return response
}

