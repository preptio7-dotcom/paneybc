export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveFeatureAccess } from '@/lib/feature-access'
import { buildDeepPerformanceAnalytics, parseAnalyticsRangeKey } from '@/lib/deep-analytics'
import {
  generateStudyRecommendations,
  getCachedRecommendations,
  setCachedRecommendations,
} from '@/lib/study-recommendations'

function isPrismaSchemaNotReadyError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022'
  }
  const message = String((error as any)?.message || '').toLowerCase()
  return (
    message.includes('does not exist') ||
    message.includes('relation') && message.includes('missing') ||
    message.includes('column') && message.includes('missing')
  )
}

export async function GET(request: NextRequest) {
  let rangeKey = 'all'
  let maxItems = 3
  try {
    const tokenUser = getCurrentUser(request)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await resolveFeatureAccess(request, 'aiRecommendations')
    if (!access) {
      return NextResponse.json(
        { error: 'Study recommendations are currently in beta testing.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    rangeKey = parseAnalyticsRangeKey(searchParams.get('range'))
    const compact = searchParams.get('compact') === '1'
    maxItems = Math.max(1, Math.min(10, Number(searchParams.get('limit') || (compact ? 3 : 10))))

    const cached = await getCachedRecommendations(prisma, access.user.id, rangeKey)
    if (cached) {
      return NextResponse.json(
        {
          success: true,
          range: rangeKey,
          fromCache: true,
          recommendations: cached.slice(0, maxItems),
          total: cached.length,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        }
      )
    }

    const analytics = await buildDeepPerformanceAnalytics(prisma, access.user.id, rangeKey)
    const context = analytics.recommendationContext

    if (context.totalQuestioned < 10) {
      return NextResponse.json(
        {
          success: true,
          range: rangeKey,
          fromCache: false,
          notEnoughData: true,
          minimumRequiredQuestions: 10,
          attemptedQuestions: context.totalQuestioned,
          recommendations: [],
          fallbackTip:
            'Start with Chapter 1 of Fundamentals of Accounting. Build momentum with at least 10 solved questions.',
        },
        {
          headers: {
            'Cache-Control': 'private, no-store',
          },
        }
      )
    }

    const generated = generateStudyRecommendations(context)
    await setCachedRecommendations(prisma, access.user.id, rangeKey, generated)

    return NextResponse.json(
      {
        success: true,
        range: rangeKey,
        fromCache: false,
        recommendations: generated.slice(0, maxItems),
        total: generated.length,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    )
  } catch (error: any) {
    if (isPrismaSchemaNotReadyError(error)) {
      // Graceful fallback when the DB is behind latest migrations.
      return NextResponse.json(
        {
          success: true,
          range: rangeKey,
          fromCache: false,
          setupRequired: true,
          recommendations: [],
          total: 0,
        },
        {
          headers: {
            'Cache-Control': 'private, no-store',
          },
        }
      )
    }
    console.error('recommendations error:', error)
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
  }
}
