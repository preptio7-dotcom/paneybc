export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { isPakistanRequest, blockedCountryResponse } from '@/lib/geo'
import { extractGeoRestrictionSettings } from '@/lib/geo-restriction'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const systemSettings = await prisma.systemSettings.findFirst({ select: { testSettings: true } })
    const geoRestriction = extractGeoRestrictionSettings(systemSettings?.testSettings || {})
    const geo = isPakistanRequest(request, { pakistanOnly: geoRestriction.pakistanOnly })
    if (!geo.allowed) {
      return blockedCountryResponse(geo.country)
    }

    const rateLimit = await enforceIpRateLimit(request, {
      scope: 'auth-login',
      maxRequests: 10,
      windowSeconds: 60,
    })
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse('login', rateLimit.retryAfterSeconds)
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, avatar: true, role: true, studentRole: true, password: true, isBanned: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    })

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || '/avatars/boy_1.png',
          role: user.role,
          studentRole: user.studentRole,
        },
      },
      { status: 200 }
    )

    const cookieDomain = process.env.COOKIE_DOMAIN
    const isProd = process.env.NODE_ENV === 'production'
    const host = request.nextUrl.hostname
    const normalizedCookieDomain = cookieDomain?.replace(/^\./, '')
    const shouldSetDomain = Boolean(
      isProd && normalizedCookieDomain && host && host.endsWith(normalizedCookieDomain)
    )
    response.cookies.set('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      ...(shouldSetDomain ? { domain: `.${normalizedCookieDomain}` } : {}),
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)

    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}

