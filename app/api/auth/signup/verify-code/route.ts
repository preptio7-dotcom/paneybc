export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail, sanitizePlainText } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'
const VERIFY_CODE_ENDPOINT = '/api/auth/signup/verify-code'

export async function POST(req: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(req)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(req)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: VERIFY_CODE_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(req, {
        scope: 'auth-signup-verify-code',
        maxRequests: 12,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: VERIFY_CODE_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('signup verification attempts', rateLimit.retryAfterSeconds)
      }
    }

    const { email, code } = await req.json()

    const suspiciousInput = detectSuspiciousInput({ email, code })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${VERIFY_CODE_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const normalizedEmail = sanitizeEmail(email)
    const normalizedCode = sanitizePlainText(code, 16)
    if (!normalizedEmail || !normalizedCode) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const otp = await prisma.otp.findFirst({
      where: {
        email: normalizedEmail,
        code: normalizedCode,
        purpose: 'signup',
        expiresAt: { gt: new Date() },
      },
    })
    if (!otp) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'failed_login',
        status: 'suspicious',
        targetEndpoint: VERIFY_CODE_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'signup' } })

    const verificationToken = jwt.sign({ email: normalizedEmail, purpose: 'signup' }, JWT_SECRET, {
      expiresIn: '15m',
    })

    return NextResponse.json({ success: true, verificationToken })
  } catch (error: any) {
    console.error('[AUTH] Signup verify-code error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
