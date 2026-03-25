export const runtime = 'nodejs'

import { BlogAnalyticsEventType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildCreatedAtRange, formatDayKey, parseAnalyticsDateRange } from '@/lib/blog-analytics'

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { from, to } = parseAnalyticsDateRange(request.nextUrl.searchParams)
  const createdAt = buildCreatedAtRange(from, to)

  const events = await prisma.blogAnalyticsEvent.findMany({
    where: {
      eventType: BlogAnalyticsEventType.page_view,
      postId: { not: null },
      createdAt,
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const dayMap = new Map<string, number>()
  for (const event of events) {
    const key = formatDayKey(event.createdAt)
    dayMap.set(key, (dayMap.get(key) || 0) + 1)
  }

  const timeline = Array.from(dayMap.entries())
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    timeline,
  })
}
