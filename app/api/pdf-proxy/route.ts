export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const isAllowedHost = (host: string) => {
  const normalized = host.toLowerCase()
  if (normalized === 'res.cloudinary.com') return true
  if (normalized.endsWith('.r2.dev')) return true
  if (normalized.endsWith('.r2.cloudflarestorage.com')) return true
  return false
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

    const upstream = await fetch(url.toString(), { cache: 'no-store' })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'application/pdf'
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', 'inline')
    headers.set('Cache-Control', 'public, max-age=3600')

    return new NextResponse(upstream.body, { status: 200, headers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Proxy error' }, { status: 500 })
  }
}
