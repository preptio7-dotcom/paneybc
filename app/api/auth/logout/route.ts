export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    {
      message: 'Logout successful',
    },
    { status: 200 }
  )

  const cookieDomain = process.env.COOKIE_DOMAIN
  const isProd = process.env.NODE_ENV === 'production'
  const baseCookie = {
    httpOnly: true,
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
  }

  // Clear without domain
  response.cookies.set('token', '', baseCookie)

  // Clear with domain (if configured)
  if (cookieDomain) {
    response.cookies.set('token', '', { ...baseCookie, domain: cookieDomain })
    if (!cookieDomain.startsWith('.')) {
      response.cookies.set('token', '', { ...baseCookie, domain: `.${cookieDomain}` })
    }
  }

  // Clear with request host (handles subdomain cookies)
  const host = request.nextUrl.hostname
  if (host) {
    response.cookies.set('token', '', { ...baseCookie, domain: host })
    if (!host.startsWith('.')) {
      response.cookies.set('token', '', { ...baseCookie, domain: `.${host}` })
    }
  }

  return response
}

