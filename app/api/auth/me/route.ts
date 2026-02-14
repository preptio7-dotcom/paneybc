import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const decodedUser = getCurrentUser(request)
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: decodedUser.userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBanned) {
      const response = NextResponse.json({ error: 'Account banned' }, { status: 403 })
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
      response.cookies.set('token', '', baseCookie)
      if (cookieDomain) {
        response.cookies.set('token', '', { ...baseCookie, domain: cookieDomain })
        if (!cookieDomain.startsWith('.')) {
          response.cookies.set('token', '', { ...baseCookie, domain: `.${cookieDomain}` })
        }
      }
      const host = request.nextUrl.hostname
      if (host) {
        response.cookies.set('token', '', { ...baseCookie, domain: host })
        if (!host.startsWith('.')) {
          response.cookies.set('token', '', { ...baseCookie, domain: `.${host}` })
        }
      }
      return response
    }

    return NextResponse.json(
      {
        message: 'User retrieved successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || '/avatars/boy_1.png',
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Me endpoint error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

