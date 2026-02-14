export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const MAX_OTP_ATTEMPTS = 3

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, avatar: true, role: true, isBanned: true, adminOtpFailedAttempts: true },
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
    }

    const otp = await prisma.otp.findFirst({
      where: { email: normalizedEmail, code: String(code).trim(), purpose: 'admin_login' },
    })

    const isExpired = otp ? otp.expiresAt.getTime() < Date.now() : true
    if (!otp || isExpired) {
      const nextAttempts = (user.adminOtpFailedAttempts || 0) + 1
      const shouldBan = nextAttempts >= MAX_OTP_ATTEMPTS

      await prisma.user.update({
        where: { id: user.id },
        data: {
          adminOtpFailedAttempts: nextAttempts,
          ...(shouldBan ? { isBanned: true } : {}),
        },
      })

      if (shouldBan) {
        await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'admin_login' } })
        return NextResponse.json(
          { error: 'Your account is blocked. Please contact support for help.' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: 'Invalid or expired code', attemptsLeft: MAX_OTP_ATTEMPTS - nextAttempts },
        { status: 401 }
      )
    }

    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'admin_login' } })
    if (user.adminOtpFailedAttempts && user.adminOtpFailedAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { adminOtpFailedAttempts: 0 },
      })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    const response = NextResponse.json(
      {
        message: 'Login successful',
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
    console.error('Admin verify error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
