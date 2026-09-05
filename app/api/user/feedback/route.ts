export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizePlainText } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'

function sanitizeFeedbackMessage(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 2000)
}

function normalizeRating(value: unknown) {
  const rating = Number(value)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null
  return rating
}

function isFeedbackTableMissing(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021'
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedback = await prisma.userFeedback.findUnique({
      where: { userId: currentUser.userId },
      select: {
        id: true,
        rating: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      hasSubmitted: Boolean(feedback),
      feedback: feedback || null,
    })
  } catch (error: any) {
    if (isFeedbackTableMissing(error)) {
      return NextResponse.json({
        hasSubmitted: false,
        feedback: null,
        setupRequired: true,
      })
    }
    return NextResponse.json({ error: error.message || 'Failed to load feedback' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: '/api/user/feedback',
        targetUserId: currentUser.userId,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(request, {
        scope: 'user-feedback-submit',
        maxRequests: 8,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: '/api/user/feedback',
          targetUserId: currentUser.userId,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('feedback submissions', rateLimit.retryAfterSeconds)
      }
    }

    const body = await request.json()
    const suspiciousInput = detectSuspiciousInput({ message: body?.message, source: body?.source })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `/api/user/feedback#${suspiciousInput.field}`,
        targetUserId: currentUser.userId,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const rating = normalizeRating(body.rating)
    const message = sanitizeFeedbackMessage(body.message)
    const source = sanitizePlainText(body.source, 80) || null

    if (!rating || !message) {
      return NextResponse.json({ error: 'Rating and feedback message are required' }, { status: 400 })
    }

    const existing = await prisma.userFeedback.findUnique({
      where: { userId: currentUser.userId },
      select: { id: true, status: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Feedback already submitted. Please use update.' },
        { status: 409 }
      )
    }

    const feedback = await prisma.userFeedback.create({
      data: {
        userId: currentUser.userId,
        rating,
        message,
        source,
      },
      select: {
        id: true,
        rating: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error: any) {
    if (isFeedbackTableMissing(error)) {
      return NextResponse.json(
        { error: 'Feedback storage is not ready yet. Please contact support.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message || 'Failed to submit feedback' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: '/api/user/feedback',
        targetUserId: currentUser.userId,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(request, {
        scope: 'user-feedback-update',
        maxRequests: 12,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: '/api/user/feedback',
          targetUserId: currentUser.userId,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('feedback updates', rateLimit.retryAfterSeconds)
      }
    }

    const body = await request.json()
    const suspiciousInput = detectSuspiciousInput({ message: body?.message, source: body?.source })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `/api/user/feedback#${suspiciousInput.field}`,
        targetUserId: currentUser.userId,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const rating = normalizeRating(body.rating)
    const message = sanitizeFeedbackMessage(body.message)
    const source = sanitizePlainText(body.source, 80) || null

    if (!rating || !message) {
      return NextResponse.json({ error: 'Rating and feedback message are required' }, { status: 400 })
    }

    const feedback = await prisma.userFeedback.update({
      where: { userId: currentUser.userId },
      data: {
        rating,
        message,
        source,
        status: 'pending',
      },
      select: {
        id: true,
        rating: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error: any) {
    if (isFeedbackTableMissing(error)) {
      return NextResponse.json(
        { error: 'Feedback storage is not ready yet. Please contact support.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message || 'Failed to update feedback' }, { status: 500 })
  }
}
