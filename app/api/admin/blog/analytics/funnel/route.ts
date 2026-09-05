export const runtime = 'nodejs'

import { BlogAnalyticsEventType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildCreatedAtRange, parseAnalyticsDateRange, percent } from '@/lib/blog-analytics'

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { from, to } = parseAnalyticsDateRange(request.nextUrl.searchParams)
  const createdAt = buildCreatedAtRange(from, to)

  const [views, readComplete, ctaClicks, signups, depthRows] = await Promise.all([
    prisma.blogAnalyticsEvent.count({
      where: {
        eventType: BlogAnalyticsEventType.page_view,
        postId: { not: null },
        createdAt,
      },
    }),
    prisma.blogAnalyticsEvent.count({
      where: {
        eventType: BlogAnalyticsEventType.read_complete,
        postId: { not: null },
        createdAt,
      },
    }),
    prisma.blogAnalyticsEvent.count({
      where: {
        eventType: BlogAnalyticsEventType.cta_click,
        createdAt,
      },
    }),
    prisma.blogAnalyticsEvent.count({
      where: {
        eventType: BlogAnalyticsEventType.signup_from_blog,
        createdAt,
      },
    }),
    prisma.blogAnalyticsEvent.findMany({
      where: {
        eventType: BlogAnalyticsEventType.page_view,
        postId: { not: null },
        createdAt,
        scrollDepth: { not: null },
      },
      select: {
        scrollDepth: true,
      },
    }),
  ])

  const depthValues = depthRows
    .map((row) => Number(row.scrollDepth || 0))
    .filter((value) => Number.isFinite(value))
  const at25 = depthValues.filter((value) => value >= 25).length
  const at50 = depthValues.filter((value) => value >= 50).length
  const at75 = depthValues.filter((value) => value >= 75).length
  const at80 = depthValues.filter((value) => value >= 80).length

  const levels = [
    { label: 'Visited the post', count: views },
    { label: 'Read past 25%', count: at25 },
    { label: 'Read past 50%', count: at50 },
    { label: 'Read past 75%', count: at75 },
    { label: 'Read complete (80%+)', count: Math.max(at80, readComplete) },
    { label: 'Clicked a CTA', count: ctaClicks },
    { label: 'Signed up', count: signups },
  ].map((level) => ({
    ...level,
    percentage: percent(level.count, views),
  }))

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    levels,
  })
}
