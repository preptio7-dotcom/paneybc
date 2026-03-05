import type { NextRequest, NextResponse } from 'next/server'
import { isPrivateCrawlPath } from '@/lib/private-crawl-routes'

const BASE_SCRIPT_SOURCES = [
  "'self'",
  "'unsafe-inline'",
  'https://pagead2.googlesyndication.com',
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://va.vercel-scripts.com',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://api.dicebear.com',
  'https://api.multiavatar.com',
  'https://models.readyplayer.me',
]

const BASE_CONNECT_SOURCES = [
  "'self'",
  'https://api.dicebear.com',
  'https://api.multiavatar.com',
  'https://models.readyplayer.me',
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://vitals.vercel-insights.com',
]

function buildContentSecurityPolicy(isDevelopment: boolean) {
  const scriptSources = [...BASE_SCRIPT_SOURCES]
  const connectSources = [...BASE_CONNECT_SOURCES]

  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'")
    connectSources.push('ws:', 'http://localhost:*', 'http://127.0.0.1:*')
  }

  return [
    `default-src 'self'`,
    `script-src ${scriptSources.join(' ')}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https:`,
    `connect-src ${connectSources.join(' ')}`,
    `frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'self'`,
    `form-action 'self'`,
    'upgrade-insecure-requests',
  ].join('; ')
}

export function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  options?: { forceProdHeaders?: boolean }
) {
  const isDevelopment = process.env.NODE_ENV !== 'production' && !options?.forceProdHeaders
  const csp = buildContentSecurityPolicy(isDevelopment)

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set(
    'Content-Security-Policy-Report-Only',
    "require-trusted-types-for 'script'; trusted-types default"
  )

  if (isPrivateCrawlPath(request.nextUrl.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  }

  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}
