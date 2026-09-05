export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

type AvatarCacheEntry = {
  body: ArrayBuffer
  contentType: string
  status: number
  expiresAt: number
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 600
const ALLOWED_HOSTS = new Set([
  'api.dicebear.com',
  'api.multiavatar.com',
  'models.readyplayer.me',
])

function getAvatarProxyCache() {
  const scopedGlobal = globalThis as typeof globalThis & {
    __preptioAvatarProxyCache?: Map<string, AvatarCacheEntry>
  }
  if (!scopedGlobal.__preptioAvatarProxyCache) {
    scopedGlobal.__preptioAvatarProxyCache = new Map<string, AvatarCacheEntry>()
  }
  return scopedGlobal.__preptioAvatarProxyCache
}

function isAllowedAvatarUrl(url: URL) {
  return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname.toLowerCase())
}

function pruneCache(cache: Map<string, AvatarCacheEntry>) {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) {
      cache.delete(key)
    }
  }

  if (cache.size <= MAX_CACHE_ENTRIES) return
  const overflow = cache.size - MAX_CACHE_ENTRIES
  const keys = Array.from(cache.keys()).slice(0, overflow)
  for (const key of keys) cache.delete(key)
}

function getResponseHeaders(contentType: string, fromCache: boolean) {
  return {
    'Content-Type': contentType || 'image/svg+xml',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
    'X-Avatar-Proxy-Cache': fromCache ? 'HIT' : 'MISS',
  }
}

function extractSeedFromTarget(url: URL) {
  if (url.hostname === 'api.multiavatar.com') {
    const segment = url.pathname.split('/').filter(Boolean).pop() || 'Preptio'
    return segment.replace(/\.svg$/i, '') || 'Preptio'
  }

  if (url.hostname === 'models.readyplayer.me') {
    const segment = url.pathname.split('/').filter(Boolean).pop() || 'Preptio'
    return segment.replace(/\.(png|jpg|jpeg|webp)$/i, '') || 'Preptio'
  }

  if (url.hostname === 'api.dicebear.com') {
    const seed = url.searchParams.get('seed')
    if (seed) return seed
  }

  return 'Preptio'
}

function fallbackDicebearUrl(seed: string) {
  return `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(seed || 'Preptio')}`
}

async function fetchExternalImage(targetUrl: string) {
  const response = await fetch(targetUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'image/*',
    },
  })

  if (!response.ok) {
    return null
  }

  const contentType = response.headers.get('content-type') || 'image/svg+xml'
  if (!contentType.startsWith('image/')) {
    return null
  }

  const body = await response.arrayBuffer()
  return { body, contentType }
}

export async function GET(request: NextRequest) {
  try {
    const encodedTarget = request.nextUrl.searchParams.get('url')
    if (!encodedTarget) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(encodedTarget)
    } catch {
      return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 })
    }

    if (!isAllowedAvatarUrl(targetUrl)) {
      return NextResponse.json({ error: 'Avatar source is not allowed' }, { status: 403 })
    }

    const cacheKey = targetUrl.toString()
    const cache = getAvatarProxyCache()
    const now = Date.now()
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return new NextResponse(cached.body.slice(0), {
        status: cached.status,
        headers: getResponseHeaders(cached.contentType, true),
      })
    }

    let payload = await fetchExternalImage(cacheKey)
    let usedFallback = false
    if (!payload) {
      const fallbackUrl = fallbackDicebearUrl(extractSeedFromTarget(targetUrl))
      payload = await fetchExternalImage(fallbackUrl)
      usedFallback = true
    }

    if (!payload) {
      return NextResponse.json({ error: 'Avatar image could not be fetched' }, { status: 502 })
    }

    const { body, contentType } = payload
    cache.set(cacheKey, {
      body,
      contentType,
      status: 200,
      expiresAt: now + CACHE_TTL_MS,
    })
    pruneCache(cache)

    return new NextResponse(body, {
      status: 200,
      headers: {
        ...getResponseHeaders(contentType, false),
        ...(usedFallback ? { 'X-Avatar-Proxy-Fallback': '1' } : {}),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Avatar proxy failed' }, { status: 500 })
  }
}
