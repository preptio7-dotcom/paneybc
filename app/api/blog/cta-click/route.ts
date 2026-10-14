export const runtime = 'nodejs'

import { BlogAnalyticsEventType, BlogCtaPosition, BlogReferrerSource } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { detectReferrerSource } from '@/lib/blog-analytics'

function normalizeCtaPosition(input: unknown): BlogCtaPosition | null {
  const value = String(input || '')
  if (value === 'mid_article') return 'mid_article'
  if (value === 'end_article') return 'end_article'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const postId = String(body?.post_id || '').trim()
    const subjectCode = String(body?.subject_code || 'GENERIC').toUpperCase().trim().slice(0, 30)
    const ctaPosition = normalizeCtaPosition(body?.cta_position)
    const sessionId = String(body?.session_id || '').trim().slice(0, 120)
    if (!postId || !ctaPosition || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = getCurrentUser(request)
    const referrerSource = detectReferrerSource(request.headers.get('referer'))

    await prisma.$transaction([
      prisma.blogCtaClick.create({
        data: {
          postId,
          subjectCode,
          ctaPosition,
          sessionId,
          userId: user?.userId || null,
        },
      }),
      prisma.blogAnalyticsEvent.create({
        data: {
          postId,
          eventType: BlogAnalyticsEventType.cta_click,
          subjectCode,
          ctaPosition,
          sessionId,
          userId: user?.userId || null,
          referrerSource: referrerSource as BlogReferrerSource,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
