import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enforceCommunityCooldown } from '@/lib/community-markdown'
import { NextRequest, NextResponse } from 'next/server'

function text(value: unknown, max: number) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max)
}

export async function GET(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await context.params
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1))
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 50)))
    const comments = await prisma.communityComment.findMany({
      where: { threadId, deleted: false },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    })
    const votes = await prisma.communityVote.findMany({
      where: { targetType: 'comment', targetId: { in: comments.map((comment) => comment.id) } },
      select: { targetId: true, value: true },
    })
    const votesByComment = new Map<string, number>()
    votes.forEach((vote) => votesByComment.set(vote.targetId, (votesByComment.get(vote.targetId) || 0) + vote.value))
    return NextResponse.json({
      comments: comments.map((comment) => ({
        ...comment,
        score: votesByComment.get(comment.id) || 0,
      })),
      page,
      limit,
      hasMore: comments.length === limit,
    })
  } catch (error) {
    console.error('Community comments list error:', error)
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!enforceCommunityCooldown(currentUser.userId, 'comment')) {
      return NextResponse.json({ error: 'Please wait before posting another comment' }, { status: 429 })
    }

    const { threadId } = await context.params
    const body = await request.json()
    const content = text(body?.body, 8_000)
    const parentCommentId = text(body?.parentCommentId, 80) || null
    if (content.length < 2) return NextResponse.json({ error: 'Comment is required' }, { status: 400 })

    const thread = await prisma.communityThread.findFirst({ where: { id: threadId, deleted: false } })
    const user = await prisma.user.findUnique({ where: { id: currentUser.userId }, select: { id: true, isBanned: true } })
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    if (thread.locked) return NextResponse.json({ error: 'This thread is locked' }, { status: 409 })
    if (!user || user.isBanned) return NextResponse.json({ error: 'Account cannot comment' }, { status: 403 })

    if (parentCommentId) {
      const parent = await prisma.communityComment.findFirst({ where: { id: parentCommentId, threadId, deleted: false } })
      if (!parent) return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
    }

    const comment = await prisma.communityComment.create({
      data: { threadId, parentCommentId, authorId: user.id, body: content },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    })
    return NextResponse.json({ comment, score: 0 }, { status: 201 })
  } catch (error) {
    console.error('Community comment create error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
