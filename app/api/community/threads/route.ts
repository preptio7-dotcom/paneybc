import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enforceCommunityCooldown } from '@/lib/community-markdown'
import { NextRequest, NextResponse } from 'next/server'

const SORTS = new Set(['hot', 'new', 'top'])

function text(value: unknown, max: number) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max)
}

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams
    const sort = SORTS.has(search.get('sort') || '') ? search.get('sort')! : 'hot'
    const page = Math.max(1, Number(search.get('page') || 1))
    const limit = Math.min(30, Math.max(1, Number(search.get('limit') || 15)))
    const category = text(search.get('category'), 80)

    const requestedSkip = sort === 'new' ? (page - 1) * limit : 0
    const requestedTake = sort === 'new' ? limit : 200
    const threads = await prisma.communityThread.findMany({
      where: { deleted: false, ...(category ? { category: { slug: category } } : {}) },
      include: {
        category: true,
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { comments: true } },
        comments: {
          where: { deleted: false, parentCommentId: null },
          orderBy: { createdAt: 'desc' },
          take: 2,
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: sort === 'new' ? { createdAt: 'desc' } : { createdAt: 'desc' },
      skip: requestedSkip,
      take: requestedTake,
    })

    const commentIds = threads.flatMap((t) => t.comments.map((c) => c.id))

    const [votes, commentVotes] = await Promise.all([
      prisma.communityVote.findMany({
        where: { targetType: 'thread', targetId: { in: threads.map((thread) => thread.id) } },
        select: { targetId: true, value: true },
      }),
      commentIds.length > 0
        ? prisma.communityVote.findMany({
            where: { targetType: 'comment', targetId: { in: commentIds } },
            select: { targetId: true, value: true },
          })
        : Promise.resolve([]),
    ])

    const votesByThread = new Map<string, number>()
    votes.forEach((vote) => votesByThread.set(vote.targetId, (votesByThread.get(vote.targetId) || 0) + vote.value))

    const votesByComment = new Map<string, number>()
    commentVotes.forEach((vote) => votesByComment.set(vote.targetId, (votesByComment.get(vote.targetId) || 0) + vote.value))

    const mapped = threads.map((thread) => {
      const threadScore = votesByThread.get(thread.id) || 0
      const ageHours = Math.max(1, (Date.now() - thread.createdAt.getTime()) / 3_600_000)
      return {
        id: thread.id,
        title: thread.title,
        body: thread.body,
        createdAt: thread.createdAt,
        locked: thread.locked,
        score: threadScore,
        hotScore: threadScore / Math.pow(ageHours + 2, 0.8),
        commentCount: thread._count.comments,
        category: thread.category,
        author: thread.author,
        previewComments: thread.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          parentCommentId: comment.parentCommentId,
          score: votesByComment.get(comment.id) || 0,
          author: comment.author,
        })),
      }
    })

    if (sort === 'hot') mapped.sort((a, b) => b.hotScore - a.hotScore)
    if (sort === 'top') mapped.sort((a, b) => b.score - a.score)

    const pagedThreads = sort === 'new' ? mapped : mapped.slice((page - 1) * limit, page * limit)
    const categories = await prisma.communityCategory.findMany({ orderBy: { displayOrder: 'asc' } })
    return NextResponse.json({ threads: pagedThreads, categories, page, limit, hasMore: sort === 'new' ? threads.length === limit : mapped.length > page * limit })
  } catch (error) {
    console.error('Community thread list error:', error)
    return NextResponse.json({ error: 'Failed to load community threads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!enforceCommunityCooldown(currentUser.userId, 'thread')) {
      return NextResponse.json({ error: 'Please wait before creating another thread' }, { status: 429 })
    }

    const body = await request.json()
    const title = text(body?.title, 160)
    const content = text(body?.body, 10_000)
    const categoryId = text(body?.categoryId, 80)
    if (title.length < 5 || content.length < 10 || !categoryId) {
      return NextResponse.json({ error: 'A category, title, and body are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: currentUser.userId }, select: { id: true, isBanned: true } })
    const category = await prisma.communityCategory.findUnique({ where: { id: categoryId } })
    if (!user || user.isBanned) return NextResponse.json({ error: 'Account cannot post' }, { status: 403 })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const thread = await prisma.communityThread.create({
      data: { title, body: content, categoryId, authorId: user.id },
      include: { category: true, author: { select: { id: true, name: true, avatar: true } } },
    })
    return NextResponse.json({ thread }, { status: 201 })
  } catch (error) {
    console.error('Community thread create error:', error)
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
  }
}
