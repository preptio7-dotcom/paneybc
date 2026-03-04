export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveFeatureAccess } from '@/lib/feature-access'
import { buildDeepPerformanceAnalytics, parseAnalyticsRangeKey } from '@/lib/deep-analytics'
import {
  generateStudyRecommendations,
  getCachedRecommendations,
  setCachedRecommendations,
} from '@/lib/study-recommendations'

export async function GET(request: NextRequest) {
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
    const rangeKey = parseAnalyticsRangeKey(searchParams.get('range'))
    const compact = searchParams.get('compact') === '1'
    const maxItems = Math.max(1, Math.min(10, Number(searchParams.get('limit') || (compact ? 3 : 10))))

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
    console.error('recommendations error:', error)
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
  }
}
