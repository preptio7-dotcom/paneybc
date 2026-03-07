export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

function getEnvAllowedHosts() {
  const hosts = new Set<string>()
  const values = [
    process.env.R2_PUBLIC_URL,
    process.env.R2_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  ]
  for (const raw of values) {
    if (!raw) continue
    try {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      const parsed = new URL(withScheme)
      if (parsed.hostname) hosts.add(parsed.hostname.toLowerCase())
    } catch {
      // ignore invalid URL-like env value
    }
  }
  return hosts
}
const ENV_ALLOWED_HOSTS = getEnvAllowedHosts()

const isAllowedHost = (host: string) => {
  const normalized = host.toLowerCase()
  if (normalized === 'res.cloudinary.com') return true
  if (normalized.endsWith('.r2.dev')) return true
  if (normalized.endsWith('.r2.cloudflarestorage.com')) return true
  if (normalized === 'preptio.com' || normalized === 'www.preptio.com') return true
  if (normalized.endsWith('.preptio.com')) return true
  if (ENV_ALLOWED_HOSTS.has(normalized)) return true
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

    const requestHost = new URL(request.url).hostname.toLowerCase()
    if (url.hostname.toLowerCase() !== requestHost && !isAllowedHost(url.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
    }

    const upstream = await fetch(url.toString(), { cache: 'no-store' })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: upstream.status })
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
