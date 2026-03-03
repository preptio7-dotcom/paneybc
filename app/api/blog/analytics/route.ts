export const runtime = 'nodejs'

import {
  BlogAnalyticsEventType,
  BlogCtaPosition,
  Prisma,
  BlogReferrerSource,
  BlogSharePlatform,
} from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { detectReferrerSource, normalizeReferrerSource } from '@/lib/blog-analytics'

function normalizeEventType(input: unknown): BlogAnalyticsEventType | null {
  const value = String(input || '')
  if (value === 'page_view') return 'page_view'
  if (value === 'read_complete') return 'read_complete'
  if (value === 'cta_click') return 'cta_click'
  if (value === 'share_click') return 'share_click'
  if (value === 'signup_from_blog') return 'signup_from_blog'
  return null
}

function normalizeCtaPosition(input: unknown): BlogCtaPosition | null {
  const value = String(input || '')
  if (value === 'mid_article') return 'mid_article'
  if (value === 'end_article') return 'end_article'
  return null
}

function normalizeSharePlatform(input: unknown): BlogSharePlatform | null {
  const value = String(input || '')
  if (value === 'whatsapp') return 'whatsapp'
  if (value === 'facebook') return 'facebook'
  if (value === 'copy') return 'copy'
  return null
}

function getUtcDayBounds(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  return {
    start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, day, 23, 59, 59, 999)),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eventType = normalizeEventType(body?.event_type)
    if (!eventType) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const sessionId = String(body?.session_id || '').trim().slice(0, 120)
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const user = getCurrentUser(request)
    const postId = body?.post_id ? String(body.post_id).trim() : null
    const subjectCode = body?.subject_code ? String(body.subject_code).toUpperCase().trim() : null
    const ctaPosition = normalizeCtaPosition(body?.cta_position)
    const sharePlatform = normalizeSharePlatform(body?.share_platform)
    const referrerSource = body?.referrer_source
      ? normalizeReferrerSource(body.referrer_source)
      : detectReferrerSource(request.headers.get('referer'))
    const timeOnPage = Number.isFinite(Number(body?.time_on_page))
      ? Math.max(0, Math.floor(Number(body.time_on_page)))
      : null
    const scrollDepth = Number.isFinite(Number(body?.scroll_depth))
      ? Math.max(0, Math.min(100, Math.floor(Number(body.scroll_depth))))
      : null

    // Optional update path: allows client to update the same page_view row on unload.
    const updateEventId = body?.update_event_id ? String(body.update_event_id) : null
    if (eventType === 'page_view' && updateEventId) {
      const updated = await prisma.blogAnalyticsEvent.updateMany({
        where: {
          id: updateEventId,
          eventType: BlogAnalyticsEventType.page_view,
          sessionId,
          ...(postId ? { postId } : { postId: null }),
        },
        data: {
          timeOnPage: timeOnPage ?? undefined,
          scrollDepth: scrollDepth ?? undefined,
        },
      })
      return NextResponse.json({ success: true, updated: updated.count > 0 })
    }

    // Keep exactly one page_view row per post + session + UTC day.
    if (eventType === BlogAnalyticsEventType.page_view) {
      const { start, end } = getUtcDayBounds()
      const existing = await prisma.blogAnalyticsEvent.findFirst({
        where: {
          eventType: BlogAnalyticsEventType.page_view,
          postId: postId || null,
          sessionId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      })

      if (existing?.id) {
        return NextResponse.json({ success: true, eventId: existing.id })
      }
    }

    let event: { id: string }
    try {
      event = await prisma.blogAnalyticsEvent.create({
        data: {
          postId,
          eventType,
          subjectCode,
          ctaPosition,
          sharePlatform,
          userId: user?.userId || null,
          sessionId,
          referrerSource: referrerSource as BlogReferrerSource,
          timeOnPage,
          scrollDepth,
        },
        select: {
          id: true,
        },
      })
    } catch (error: any) {
      if (
        eventType === BlogAnalyticsEventType.page_view &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const { start, end } = getUtcDayBounds()
        const existing = await prisma.blogAnalyticsEvent.findFirst({
          where: {
            eventType: BlogAnalyticsEventType.page_view,
            postId: postId || null,
            sessionId,
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        })
        if (existing?.id) {
          return NextResponse.json({ success: true, eventId: existing.id })
        }
      }
      throw error
    }

    return NextResponse.json({ success: true, eventId: event.id })
  } catch {
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
