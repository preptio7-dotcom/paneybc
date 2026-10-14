export const runtime = 'nodejs'

import { BlogAnalyticsEventType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { BLOG_SUBJECT_META } from '@/lib/blog-related-subjects'
import { buildCreatedAtRange, parseAnalyticsDateRange, percent } from '@/lib/blog-analytics'

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { from, to } = parseAnalyticsDateRange(request.nextUrl.searchParams)
  const createdAt = buildCreatedAtRange(from, to)

  const [posts, pageViewRows, ctaRows, signupRows] = await Promise.all([
    prisma.blogPost.findMany({
      select: {
        id: true,
        relatedSubjects: true,
      },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId'],
      where: {
        eventType: BlogAnalyticsEventType.page_view,
        createdAt,
        postId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['subjectCode'],
      where: {
        eventType: BlogAnalyticsEventType.cta_click,
        createdAt,
      },
      _count: { _all: true },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId'],
      where: {
        eventType: BlogAnalyticsEventType.signup_from_blog,
        createdAt,
        postId: { not: null },
      },
      _count: { _all: true },
    }),
  ])

  const postSubjects = new Map<string, string[]>()
  for (const post of posts) {
    const related = Array.isArray(post.relatedSubjects)
      ? post.relatedSubjects.map((item) => String(item || '').toUpperCase()).filter(Boolean)
      : []
    postSubjects.set(post.id, related)
  }

  const impressions = new Map<string, number>()
  for (const row of pageViewRows) {
    const postId = String(row.postId || '')
    const related = postSubjects.get(postId) || []
    const views = Number(row._count._all || 0)
    for (const subject of related) {
      impressions.set(subject, (impressions.get(subject) || 0) + views)
    }
  }

  const clickMap = new Map(
    ctaRows.map((row) => [String(row.subjectCode || '').toUpperCase(), Number(row._count._all || 0)])
  )

  const signupMap = new Map<string, number>()
  for (const row of signupRows) {
    const postId = String(row.postId || '')
    const related = postSubjects.get(postId) || []
    const count = Number(row._count._all || 0)
    for (const subject of related) {
      signupMap.set(subject, (signupMap.get(subject) || 0) + count)
    }
  }

  const subjects = Object.keys(BLOG_SUBJECT_META)
  const rows = subjects.map((subjectCode) => {
    const impressionCount = impressions.get(subjectCode) || 0
    const clickCount = clickMap.get(subjectCode) || 0
    const signupCount = signupMap.get(subjectCode) || 0
    return {
      subjectCode,
      subjectName: BLOG_SUBJECT_META[subjectCode as keyof typeof BLOG_SUBJECT_META].name,
      impressions: impressionCount,
      clicks: clickCount,
      ctr: percent(clickCount, impressionCount),
      signups: signupCount,
    }
  })

  const top = rows.slice().sort((a, b) => b.ctr - a.ctr)[0] || null

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    rows,
    insight:
      top && top.impressions > 0
        ? `${top.subjectName} has the highest CTA engagement.`
        : 'No CTA activity yet in this date range.',
  })
}
