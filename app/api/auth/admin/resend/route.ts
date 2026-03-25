export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAdminOTPEmail } from '@/lib/email'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'

const ADMIN_RESEND_ENDPOINT = '/api/auth/admin/resend'

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: ADMIN_RESEND_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(request, {
        scope: 'auth-admin-resend',
        maxRequests: 8,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: ADMIN_RESEND_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('admin otp resend', rateLimit.retryAfterSeconds)
      }
    }

    const { email } = await request.json()
    const suspiciousInput = detectSuspiciousInput({ email })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${ADMIN_RESEND_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = sanitizeEmail(email)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, role: true, isBanned: true },
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'admin_login' } })
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        code,
        purpose: 'admin_login',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    try {
      await sendAdminOTPEmail(normalizedEmail, code)
    } catch (emailError: any) {
      console.error('[EMAIL] Admin OTP resend failed:', emailError)
      return NextResponse.json({
        error: 'Failed to send email. Check SMTP settings in .env',
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'OTP resent successfully' })
  } catch (error: any) {
    console.error('Admin OTP resend error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
