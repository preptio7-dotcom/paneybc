export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/community/me/threads
 * The signed-in user's own discussions, with score, comment count, and
 * moderation state, so they can jump in to edit, read comments, or check votes.
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = getCurrentUser(request)
    if (!viewer?.userId) return NextResponse.json({ error: 'Please log in to see your posts.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const [threads, total] = await Promise.all([
      prisma.communityThread.findMany({
        where: { authorId: viewer.userId, deleted: false },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          postType: true,
          isAnonymous: true,
          createdAt: true,
          editedAt: true,
          locked: true,
          solvedAt: true,
          pinnedAt: true,
          category: { select: { name: true, slug: true, isHidden: true } },
          _count: { select: { comments: { where: { deleted: false } } } },
        },
      }),
      prisma.communityThread.count({ where: { authorId: viewer.userId, deleted: false } }),
    ])

    const ids = threads.map((t) => t.id)
    const votes = ids.length
      ? await prisma.communityVote.groupBy({
          by: ['targetId'],
          where: { targetType: 'thread', targetId: { in: ids } },
          _sum: { value: true },
        })
      : []
    const scores = new Map(votes.map((v) => [v.targetId, v._sum.value ?? 0]))

    return NextResponse.json(
      {
        threads: threads.map(({ _count, ...t }) => ({
          ...t,
          score: scores.get(t.id) ?? 0,
          commentCount: _count.comments,
          // Opens the discussion where edit, comments and voting already exist.
          href: `/community?thread=${t.id}`,
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[community/me/threads] GET error:', err)
    return NextResponse.json({ error: 'Unable to load your posts. Please try again.' }, { status: 503 })
  }
}
