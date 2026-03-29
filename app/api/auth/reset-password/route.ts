export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizePlainText } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'

const RESET_PASSWORD_ENDPOINT = '/api/auth/reset-password'

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: RESET_PASSWORD_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(request, {
        scope: 'auth-reset-password',
        maxRequests: 8,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: RESET_PASSWORD_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('password reset attempts', rateLimit.retryAfterSeconds)
      }
    }

    const { token, password } = await request.json()

    const suspiciousInput = detectSuspiciousInput({ token, password })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${RESET_PASSWORD_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const normalizedToken = sanitizePlainText(token, 256)
    const normalizedPassword = String(password || '')

    if (!normalizedToken || !normalizedPassword) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (normalizedPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const hashedToken = crypto.createHash('sha256').update(normalizedToken).digest('hex')

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
      },
      select: {
        id: true,
        resetPasswordExpires: true,
      },
    })
    
    if (!user || (user.resetPasswordExpires && user.resetPasswordExpires.getTime() < Date.now())) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    const hashedPassword = await bcryptjs.hash(normalizedPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    })

    return NextResponse.json({ message: 'Password reset successful' })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
