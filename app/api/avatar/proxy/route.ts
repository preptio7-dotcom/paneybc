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

    const upstream = await fetch(cacheKey, {
      cache: 'no-store',
      headers: {
        Accept: 'image/*',
      },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Avatar image could not be fetched' },
        { status: upstream.status || 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'image/svg+xml'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid avatar response' }, { status: 415 })
    }

    const body = await upstream.arrayBuffer()
    cache.set(cacheKey, {
      body,
      contentType,
      status: 200,
      expiresAt: now + CACHE_TTL_MS,
    })
    pruneCache(cache)

    return new NextResponse(body, {
      status: 200,
      headers: getResponseHeaders(contentType, false),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Avatar proxy failed' }, { status: 500 })
  }
}
