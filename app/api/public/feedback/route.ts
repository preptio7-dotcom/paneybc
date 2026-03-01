export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canAccessBetaFeature, extractBetaFeatureSettings } from '@/lib/beta-features'
import { resolveAvatarsForUsers } from '@/lib/avatar-pack-service'

const MAX_FEEDBACK_CARDS = 20
const MAX_MESSAGE_LENGTH = 600

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function isFeedbackTableMissing(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021'
  )
}

export async function GET(request: NextRequest) {
  const jsonHeaders = {
    'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
  }

  try {
    const currentUser = getCurrentUser(request)

    let settings = await prisma.systemSettings.findFirst({
      select: { testSettings: true },
    })

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { adsEnabled: false },
        select: { testSettings: true },
      })
    }

    const savedTestSettings =
      settings.testSettings && typeof settings.testSettings === 'object' && !Array.isArray(settings.testSettings)
        ? (settings.testSettings as Record<string, unknown>)
        : {}

    const betaFeatures = extractBetaFeatureSettings(savedTestSettings)
    const visibility = betaFeatures.studentFeedback

    let canView = canAccessBetaFeature(visibility, null)
    if (!canView && currentUser) {
      if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        canView = true
      } else {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          select: { studentRole: true },
        })
        canView = canAccessBetaFeature(visibility, user?.studentRole)
      }
    }

    if (!canView) {
      return NextResponse.json(
        {
          sectionVisible: false,
          visibility,
          averageRating: null,
          totalReviews: 0,
          reviews: [],
        },
        { headers: jsonHeaders }
      )
    }

    const [feedbackRows, aggregate] = await Promise.all([
      prisma.userFeedback.findMany({
        where: { status: 'approved' },
        orderBy: { createdAt: 'desc' },
        take: MAX_FEEDBACK_CARDS,
        select: {
          id: true,
          rating: true,
          message: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              city: true,
              level: true,
              avatar: true,
              avatarId: true,
            },
          },
        },
      }),
      prisma.userFeedback.aggregate({
        where: { status: 'approved' },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ])

    const totalReviews = aggregate._count.id || 0
    const averageRatingRaw = Number(aggregate._avg.rating ?? 0)
    const averageRating = totalReviews > 0 ? Number(averageRatingRaw.toFixed(1)) : null

    const resolvedAvatars = await resolveAvatarsForUsers(
      feedbackRows.map((row) => row.user || {})
    )
    const reviews = feedbackRows.map((row, index) => ({
      id: row.id,
      rating: row.rating,
      message: sanitizeText(row.message, MAX_MESSAGE_LENGTH),
      createdAt: row.createdAt,
      user: {
        name: sanitizeText(row.user?.name || 'Student', 120),
        city: sanitizeText(row.user?.city || '', 80),
        level: sanitizeText(row.user?.level || '', 60),
        avatar: resolvedAvatars[index]?.avatar || '',
      },
    }))

    return NextResponse.json(
      {
        sectionVisible: reviews.length > 0,
        visibility,
        averageRating,
        totalReviews,
        reviews,
      },
      { headers: jsonHeaders }
    )
  } catch (error: any) {
    if (isFeedbackTableMissing(error)) {
      return NextResponse.json(
        {
          sectionVisible: false,
          averageRating: null,
          totalReviews: 0,
          reviews: [],
        },
        { headers: jsonHeaders }
      )
    }
    console.error('Public feedback fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load feedback' },
      { status: 500, headers: jsonHeaders }
    )
  }
}
