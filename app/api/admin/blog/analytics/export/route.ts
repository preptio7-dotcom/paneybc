export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildCreatedAtRange, parseAnalyticsDateRange } from '@/lib/blog-analytics'
import { BlogAnalyticsEventType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { from, to } = parseAnalyticsDateRange(request.nextUrl.searchParams)
  const createdAt = buildCreatedAtRange(from, to)

  const events = await prisma.blogAnalyticsEvent.findMany({
    where: { createdAt },
    include: {
      post: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10_000,
  })

  const header = [
    'Row',
    'Post ID',
    'Post Slug',
    'Post Title',
    'Event Type',
    'Subject Code',
    'CTA Position',
    'Share Platform',
    'Session ID',
    'Referrer Source',
    'Time On Page',
    'Scroll Depth',
    'Timestamp UTC',
  ]

  const rows = events.map((event, index) => [
    index + 1,
    event.postId || '',
    event.post?.slug || '',
    event.post?.title || '',
    event.eventType,
    event.subjectCode || '',
    event.ctaPosition || '',
    event.sharePlatform || '',
    event.sessionId,
    event.referrerSource,
    event.timeOnPage ?? '',
    event.scrollDepth ?? '',
    event.createdAt.toISOString(),
  ])

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n')

  const fileDate = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"blog-analytics-${fileDate}.csv\"`,
      'Cache-Control': 'no-store',
    },
  })
}
