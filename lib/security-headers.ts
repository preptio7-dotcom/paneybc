import type { NextRequest, NextResponse } from 'next/server'
import { isPrivateCrawlPath } from '@/lib/private-crawl-routes'

const BASE_SCRIPT_SOURCES = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  'https://pagead2.googlesyndication.com',
  'https://adservice.google.com',
  'https://www.googletagservices.com',
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://ep2.adtrafficquality.google',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://va.vercel-scripts.com',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://api.dicebear.com',
  'https://api.multiavatar.com',
  'https://models.readyplayer.me',
  'https://www.clarity.ms',
]

const BASE_CONNECT_SOURCES = [
  "'self'",
  'https://api.dicebear.com',
  'https://api.multiavatar.com',
  'https://models.readyplayer.me',
  'https://pagead2.googlesyndication.com',
  'https://adservice.google.com',
  'https://googleads.g.doubleclick.net',
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://vitals.vercel-insights.com',
  'https://www.clarity.ms',
]

const BASE_FRAME_SOURCES = [
  "'self'",
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://ep2.adtrafficquality.google',
  'https://www.google.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
]

const BASE_IMG_SOURCES = [
  "'self'",
  'data:',
  'blob:',
  'https://pagead2.googlesyndication.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://www.google-analytics.com',
  // keep existing broad https image support for remote assets
  'https:',
]

function buildContentSecurityPolicy(isDevelopment: boolean) {
  const scriptSources = [...BASE_SCRIPT_SOURCES]
  const connectSources = [...BASE_CONNECT_SOURCES]
  const frameSources = [...BASE_FRAME_SOURCES]
  const imgSources = [...BASE_IMG_SOURCES]

  if (isDevelopment) {
    connectSources.push('ws:', 'http://localhost:*', 'http://127.0.0.1:*')
  }

  return [
    `default-src 'self'`,
    `script-src ${scriptSources.join(' ')}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `img-src ${imgSources.join(' ')}`,
    `connect-src ${connectSources.join(' ')}`,
    `frame-src ${frameSources.join(' ')}`,
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
  // AdSense cross-origin resources are blocked under `require-corp`.
  // Use unsafe-none so guest pages can render ad scripts/frames correctly.
  response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
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
