export const runtime = 'nodejs'

import { BlogAnalyticsEventType, type BlogReferrerSource } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildCreatedAtRange, formatDayKey, parseAnalyticsDateRange, percent } from '@/lib/blog-analytics'

type SortKey =
  | 'views'
  | 'avgReadTime'
  | 'avgScrollDepth'
  | 'ctaClicks'
  | 'ctaCtr'
  | 'signups'
  | 'publishedAt'

function toSortKey(value: string | null): SortKey {
  switch (value) {
    case 'avgReadTime':
    case 'avgScrollDepth':
    case 'ctaClicks':
    case 'ctaCtr':
    case 'signups':
    case 'publishedAt':
      return value
    default:
      return 'views'
  }
}

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const { from, to } = parseAnalyticsDateRange(searchParams)
  const createdAt = buildCreatedAtRange(from, to)
  const postId = String(searchParams.get('postId') || '').trim() || null
  const sortBy = toSortKey(searchParams.get('sortBy'))
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  const whereBase = {
    createdAt,
    ...(postId ? { postId } : {}),
  }

  const [posts, pageViews, ctaClicks, signups, readCompletions, sourceRows] = await Promise.all([
    prisma.blogPost.findMany({
      where: postId ? { id: postId } : undefined,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
      },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId'],
      where: {
        ...whereBase,
        eventType: BlogAnalyticsEventType.page_view,
        postId: postId ? postId : { not: null },
      },
      _count: { _all: true },
      _avg: { timeOnPage: true, scrollDepth: true },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId'],
      where: {
        ...whereBase,
        eventType: BlogAnalyticsEventType.cta_click,
        postId: postId ? postId : { not: null },
      },
      _count: { _all: true },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId'],
      where: {
        ...whereBase,
        eventType: BlogAnalyticsEventType.signup_from_blog,
        postId: postId ? postId : { not: null },
      },
      _count: { _all: true },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId'],
      where: {
        ...whereBase,
        eventType: BlogAnalyticsEventType.read_complete,
        postId: postId ? postId : { not: null },
      },
      _count: { _all: true },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId', 'referrerSource'],
      where: {
        ...whereBase,
        eventType: BlogAnalyticsEventType.page_view,
        postId: postId ? postId : { not: null },
      },
      _count: { _all: true },
    }),
  ])

  const postMap = new Map(posts.map((post) => [post.id, post]))
  const ctaMap = new Map(ctaClicks.map((row) => [String(row.postId), Number(row._count._all || 0)]))
  const signupMap = new Map(signups.map((row) => [String(row.postId), Number(row._count._all || 0)]))
  const readCompleteMap = new Map(readCompletions.map((row) => [String(row.postId), Number(row._count._all || 0)]))

  const sourceMap = new Map<string, Map<BlogReferrerSource, number>>()
  for (const row of sourceRows) {
    const key = String(row.postId)
    if (!sourceMap.has(key)) sourceMap.set(key, new Map())
    sourceMap.get(key)!.set(row.referrerSource, Number(row._count._all || 0))
  }

  const rows = pageViews
    .map((row) => {
      const id = String(row.postId || '')
      if (!id) return null
      const post = postMap.get(id)
      if (!post) return null
      const views = Number(row._count._all || 0)
      const ctaCount = ctaMap.get(id) || 0
      const signupCount = signupMap.get(id) || 0
      const readCompleteCount = readCompleteMap.get(id) || 0
      const topSource = (() => {
        const entries = Array.from((sourceMap.get(id) || new Map()).entries())
        if (!entries.length) return 'direct'
        return entries.sort((a, b) => b[1] - a[1])[0][0]
      })()
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        views,
        avgReadTimeSeconds: Number(row._avg.timeOnPage || 0),
        avgScrollDepth: Number(row._avg.scrollDepth || 0),
        ctaClicks: ctaCount,
        ctaCtr: percent(ctaCount, views),
        signups: signupCount,
        readCompletionRate: percent(readCompleteCount, views),
        topSource,
      }
    })
    .filter(Boolean) as Array<{
    id: string
    title: string
    slug: string
    publishedAt: string | null
    views: number
    avgReadTimeSeconds: number
    avgScrollDepth: number
    ctaClicks: number
    ctaCtr: number
    signups: number
    readCompletionRate: number
    topSource: BlogReferrerSource | string
  }>

  rows.sort((a, b) => {
    const left =
      sortBy === 'avgReadTime'
        ? a.avgReadTimeSeconds
        : sortBy === 'avgScrollDepth'
          ? a.avgScrollDepth
          : sortBy === 'ctaClicks'
            ? a.ctaClicks
            : sortBy === 'ctaCtr'
              ? a.ctaCtr
              : sortBy === 'signups'
                ? a.signups
                : sortBy === 'publishedAt'
                  ? new Date(a.publishedAt || 0).getTime()
                  : a.views
    const right =
      sortBy === 'avgReadTime'
        ? b.avgReadTimeSeconds
        : sortBy === 'avgScrollDepth'
          ? b.avgScrollDepth
          : sortBy === 'ctaClicks'
            ? b.ctaClicks
            : sortBy === 'ctaCtr'
              ? b.ctaCtr
              : sortBy === 'signups'
                ? b.signups
                : sortBy === 'publishedAt'
                  ? new Date(b.publishedAt || 0).getTime()
                  : b.views
    return sortOrder === 'asc' ? left - right : right - left
  })

  let timeline: Array<{ date: string; views: number }> = []
  if (postId) {
    const pageViewEvents = await prisma.blogAnalyticsEvent.findMany({
      where: {
        eventType: BlogAnalyticsEventType.page_view,
        postId,
        createdAt,
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const dayMap = new Map<string, number>()
    for (const event of pageViewEvents) {
      const day = formatDayKey(event.createdAt)
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
    timeline = Array.from(dayMap.entries()).map(([date, views]) => ({ date, views }))
  }

  const responseItems = postId
    ? rows.map((item) => ({ ...item, timeline }))
    : rows

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    items: responseItems,
  })
}
