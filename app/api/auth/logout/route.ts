export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth-cookie'

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    {
      message: 'Logout successful',
    },
    { status: 200 }
  )

  clearAuthCookie(response, {
    cookieName: 'token',
    isProd: process.env.NODE_ENV === 'production',
    host: request.nextUrl.hostname,
    configuredDomain: process.env.COOKIE_DOMAIN,
  })

  return response
}

