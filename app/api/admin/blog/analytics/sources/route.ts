export const runtime = 'nodejs'

import { BlogAnalyticsEventType, BlogReferrerSource } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildCreatedAtRange, parseAnalyticsDateRange, percent } from '@/lib/blog-analytics'

const SOURCE_ORDER: BlogReferrerSource[] = ['google', 'whatsapp', 'facebook', 'direct', 'other']

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { from, to } = parseAnalyticsDateRange(request.nextUrl.searchParams)
  const createdAt = buildCreatedAtRange(from, to)
  const grouped = await prisma.blogAnalyticsEvent.groupBy({
    by: ['referrerSource'],
    where: {
      eventType: BlogAnalyticsEventType.page_view,
      createdAt,
    },
    _count: {
      _all: true,
    },
  })

  const total = grouped.reduce((sum, row) => sum + Number(row._count._all || 0), 0)
  const sourceMap = new Map(grouped.map((row) => [row.referrerSource, Number(row._count._all || 0)]))
  const sources = SOURCE_ORDER.map((source) => {
    const count = sourceMap.get(source) || 0
    return {
      source,
      count,
      percentage: percent(count, total),
    }
  })

  const topSource = sources.slice().sort((a, b) => b.count - a.count)[0]?.source || 'direct'

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    total,
    topSource,
    sources,
  })
}
