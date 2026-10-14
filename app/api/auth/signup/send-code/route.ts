export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSignupVerificationEmail } from '@/lib/email'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'

const SEND_CODE_ENDPOINT = '/api/auth/signup/send-code'

export async function POST(req: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(req)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(req)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: SEND_CODE_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(req, {
        scope: 'auth-signup-send-code',
        maxRequests: 5,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: SEND_CODE_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('signup code requests', rateLimit.retryAfterSeconds)
      }
    }

    const { email } = await req.json()

    const suspiciousInput = detectSuspiciousInput({ email })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${SEND_CODE_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const normalizedEmail = sanitizeEmail(email)
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const latestOtp = await prisma.otp.findFirst({
      where: { email: normalizedEmail, purpose: 'signup' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (latestOtp && Date.now() - new Date(latestOtp.createdAt).getTime() < 45_000) {
      return NextResponse.json({ error: 'Please wait a few seconds before requesting a new code' }, { status: 429 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'signup' } })
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        code,
        purpose: 'signup',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    try {
      await sendSignupVerificationEmail(normalizedEmail, code)
    } catch (emailError: any) {
      console.error('[EMAIL] Signup verification send failed:', emailError)
      return NextResponse.json({ error: 'Failed to send verification email. Check SMTP settings.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Verification code sent' })
  } catch (error: any) {
    console.error('[AUTH] Signup send-code error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
