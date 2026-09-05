import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function getAllowedR2Hosts() {
  const hosts = new Set<string>()
  const configuredUrls = [
    process.env.R2_PUBLIC_URL,
    process.env.R2_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  ]

  for (const configuredUrl of configuredUrls) {
    if (!configuredUrl) continue
    try {
      const value = /^https?:\/\//i.test(configuredUrl)
        ? configuredUrl
        : `https://${configuredUrl}`
      hosts.add(new URL(value).hostname.toLowerCase())
    } catch {
      // Ignore malformed configuration values.
    }
  }

  return hosts
}

function isAllowedR2Host(hostname: string) {
  const host = hostname.toLowerCase()
  const configuredHosts = getAllowedR2Hosts()
  return (
    configuredHosts.has(host) ||
    (host.startsWith('pub-') && host.endsWith('.r2.dev')) ||
    host.endsWith('.r2.cloudflarestorage.com')
  )
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      )
    }

    let target: URL
    try {
      target = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    if (target.protocol !== 'https:' || !isAllowedR2Host(target.hostname)) {
      return NextResponse.json(
        { error: 'Only configured R2 image hosts are allowed' },
        { status: 403 }
      )
    }

    // Fetch image from R2
    const response = await fetch(target, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      )
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream content is not an image' }, { status: 415 })
    }

    // Return with proper CORS headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': '*',
      },
    })
  } catch (error) {
    console.error('[R2 Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    )
  }
}
