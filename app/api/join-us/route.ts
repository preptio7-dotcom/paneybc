export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendJoinUsAdminEmail, sendJoinUsThankYouEmail } from '@/lib/email'
import { getCurrentUser } from '@/lib/auth'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail, sanitizeMultilineText, sanitizePlainText } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'

const JOIN_US_ENDPOINT = '/api/join-us'

export async function POST(req: NextRequest) {
  try {
    const currentUser = getCurrentUser(req)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipAddress = getRequestIpAddress(req)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(req)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: JOIN_US_ENDPOINT,
        targetUserId: currentUser.userId,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(req, {
        scope: 'join-us-submit',
        maxRequests: 5,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: JOIN_US_ENDPOINT,
          targetUserId: currentUser.userId,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('join us submissions', rateLimit.retryAfterSeconds)
      }
    }

    const body = await req.json()
    const suspiciousInput = detectSuspiciousInput(body || {})
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${JOIN_US_ENDPOINT}#${suspiciousInput.field}`,
        targetUserId: currentUser.userId,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const payload = {
      type: sanitizePlainText(body?.type, 40).toLowerCase(),
      name: sanitizePlainText(body?.name, 120),
      email: sanitizeEmail(body?.email),
      phone: sanitizePlainText(body?.phone, 40) || null,
      institute: sanitizePlainText(body?.institute, 140) || null,
      role: sanitizePlainText(body?.role, 140) || null,
      experience: sanitizeMultilineText(body?.experience, 2000) || null,
      message: sanitizeMultilineText(body?.message, 4000) || null,
    }

    if (!payload.type || !payload.name || !payload.email) {
      return NextResponse.json({ error: 'Type, name, and email are required' }, { status: 400 })
    }

    await prisma.joinUsRequest.create({ data: payload })

    try {
      await sendJoinUsThankYouEmail(payload.email, payload.name, payload.type)
      await sendJoinUsAdminEmail(payload)
    } catch (emailError) {
      console.error('Join Us email error:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Join Us submit error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
