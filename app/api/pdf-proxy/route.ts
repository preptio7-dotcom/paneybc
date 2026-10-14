export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const MAX_PDF_BYTES = 25 * 1024 * 1024

function getAllowedHosts() {
  const hosts = new Set<string>()
  const values = [
    process.env.R2_PUBLIC_URL,
    process.env.R2_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  ]

  for (const raw of values) {
    if (!raw) continue
    try {
      const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      hosts.add(new URL(value).hostname.toLowerCase())
    } catch {
      // Ignore malformed configuration values.
    }
  }

  return hosts
}

function isAllowedHost(hostname: string) {
  const host = hostname.toLowerCase()
  const configuredHosts = getAllowedHosts()
  const isPrivateHost =
    host === 'localhost' ||
    host === '::1' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.startsWith('169.254.')

  if (isPrivateHost) return false
  return configuredHosts.has(host)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get('url')
    if (!target) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    let url: URL
    try {
      url = new URL(target)
    } catch {
      return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 })
    }

    if (url.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only https URLs are allowed' }, { status: 400 })
    }

    if (!isAllowedHost(url.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
    }

    const upstream = await fetch(url, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: upstream.status })
    }

    const contentLength = Number(upstream.headers.get('content-length') || 0)
    if (contentLength > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF is too large' }, { status: 413 })
    }

    const body = await upstream.arrayBuffer()
    if (body.byteLength > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF is too large' }, { status: 413 })
    }

    const contentType = upstream.headers.get('content-type') || ''
    if (!contentType.toLowerCase().split(';')[0].trim().includes('pdf')) {
      return NextResponse.json({ error: 'Upstream content is not a PDF' }, { status: 415 })
    }
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', 'inline')
    headers.set('Cache-Control', 'public, max-age=3600')

    return new NextResponse(body, { status: 200, headers })
  } catch (error) {
    console.error('PDF proxy error:', error)
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
