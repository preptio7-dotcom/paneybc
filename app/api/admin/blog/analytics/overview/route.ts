export const runtime = 'nodejs'

import { BlogAnalyticsEventType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildCreatedAtRange, parseAnalyticsDateRange, percent } from '@/lib/blog-analytics'

async function getOverview(from: Date, to: Date) {
  const createdAt = buildCreatedAtRange(from, to)
  const [totalViews, ctaClicks, signups, pageViewAverages] = await Promise.all([
    prisma.blogAnalyticsEvent.count({
      where: { eventType: BlogAnalyticsEventType.page_view, postId: { not: null }, createdAt },
    }),
    prisma.blogAnalyticsEvent.count({
      where: { eventType: BlogAnalyticsEventType.cta_click, createdAt },
    }),
    prisma.blogAnalyticsEvent.count({
      where: { eventType: BlogAnalyticsEventType.signup_from_blog, createdAt },
    }),
    prisma.blogAnalyticsEvent.aggregate({
      where: { eventType: BlogAnalyticsEventType.page_view, postId: { not: null }, createdAt },
      _avg: {
        timeOnPage: true,
        scrollDepth: true,
      },
    }),
  ])

  return {
    totalViews,
    ctaClicks,
    signups,
    avgReadTimeSeconds: Number(pageViewAverages._avg.timeOnPage || 0),
    avgScrollDepth: Number(pageViewAverages._avg.scrollDepth || 0),
    ctaCtr: percent(ctaClicks, totalViews),
    conversionRate: percent(signups, totalViews),
  }
}

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { from, to, previousFrom, previousTo } = parseAnalyticsDateRange(request.nextUrl.searchParams)
  const [current, previous] = await Promise.all([getOverview(from, to), getOverview(previousFrom, previousTo)])
  const viewsChangePercent =
    previous.totalViews > 0
      ? ((current.totalViews - previous.totalViews) / previous.totalViews) * 100
      : current.totalViews > 0
        ? 100
        : 0

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    metrics: {
      ...current,
      viewsChangePercent,
    },
  })
}
