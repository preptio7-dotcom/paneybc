export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail, sanitizePlainText } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent, maybeAutoBlockIp } from '@/lib/ip-security'

const MAX_OTP_ATTEMPTS = 3
const ADMIN_VERIFY_ENDPOINT = '/api/auth/admin/verify'

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: ADMIN_VERIFY_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(request, {
        scope: 'auth-admin-verify',
        maxRequests: 20,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: ADMIN_VERIFY_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('admin otp verification', rateLimit.retryAfterSeconds)
      }
    }

    const { email, code } = await request.json()
    const suspiciousInput = detectSuspiciousInput({ email, code })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${ADMIN_VERIFY_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const normalizedEmail = sanitizeEmail(email)
    const normalizedCode = sanitizePlainText(code, 16)

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
      where: { email: normalizedEmail, code: normalizedCode, purpose: 'admin_login' },
    })

    const isExpired = otp ? otp.expiresAt.getTime() < Date.now() : true
    if (!otp || isExpired) {
      const nextAttempts = (user.adminOtpFailedAttempts || 0) + 1
      const shouldBan = nextAttempts >= MAX_OTP_ATTEMPTS

      await logSecurityEvent({
        ipAddress,
        activityType: 'failed_login',
        status: shouldBan ? 'active_threat' : 'suspicious',
        targetEndpoint: ADMIN_VERIFY_ENDPOINT,
        targetUserId: user.id,
      })

      await prisma.user.update({
        where: { id: user.id },
        data: {
          adminOtpFailedAttempts: nextAttempts,
          ...(shouldBan ? { isBanned: true } : {}),
        },
      })

      if (shouldBan) {
        await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'admin_login' } })
        await logSecurityEvent({
          ipAddress,
          activityType: 'brute_force_attempt',
          status: 'active_threat',
          targetEndpoint: ADMIN_VERIFY_ENDPOINT,
          targetUserId: user.id,
          attemptsIncrement: nextAttempts,
        })
        await logSecurityEvent({
          ipAddress,
          activityType: 'account_lockout',
          status: 'blocked',
          targetEndpoint: ADMIN_VERIFY_ENDPOINT,
          targetUserId: user.id,
          attemptsIncrement: nextAttempts,
        })
        await maybeAutoBlockIp({
          ipAddress,
          reason: 'Auto-blocked after repeated brute force attempts',
          totalAttemptsBeforeBlock: nextAttempts,
        })
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
