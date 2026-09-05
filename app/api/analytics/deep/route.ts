export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveFeatureAccess } from '@/lib/feature-access'
import { buildDeepPerformanceAnalytics, parseAnalyticsRangeKey } from '@/lib/deep-analytics'

export async function GET(request: NextRequest) {
  try {
    const tokenUser = getCurrentUser(request)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await resolveFeatureAccess(request, 'performanceAnalytics')
    if (!access) {
      return NextResponse.json(
        { error: 'Performance analytics is currently in beta testing.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const rangeKey = parseAnalyticsRangeKey(searchParams.get('range'))
    const analytics = await buildDeepPerformanceAnalytics(prisma, access.user.id, rangeKey)

    return NextResponse.json(
      {
        success: true,
        range: rangeKey,
        analytics: analytics.payload,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    )
  } catch (error: any) {
    console.error('deep analytics error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
