import { Prisma } from '@prisma/client'
import { CommunityError, lockThread, mutationError, notifyComment } from '@/lib/community-mutations'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canParticipate, communityLimit } from '@/lib/community-server'
import { communityText, pagination } from '@/lib/community-input'
import { NextRequest, NextResponse } from 'next/server'

const authorSelect = { id: true, name: true, avatar: true } as const

export async function GET(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await context.params
    const paging = pagination(request.nextUrl.searchParams, 50, 100)
    if (!paging) return NextResponse.json({ error: 'Invalid page or limit.' }, { status: 400 })
    const thread = await prisma.communityThread.findFirst({ where: { id: threadId, deleted: false }, select: { id: true, locked: true, acceptedCommentId: true } })
    if (!thread) return NextResponse.json({ error: 'This discussion is no longer available.' }, { status: 404 })
    const sort = request.nextUrl.searchParams.get('sort') || 'oldest'
    if (!['oldest', 'new', 'top'].includes(sort)) return NextResponse.json({ error: 'Invalid comment sort.' }, { status: 400 })
    const focus = request.nextUrl.searchParams.get('focus') || thread.acceptedCommentId
    const order = sort === 'oldest' ? Prisma.sql`c.created_at ASC, c.id ASC` : sort === 'new' ? Prisma.sql`c.created_at DESC, c.id DESC` : Prisma.sql`COALESCE(v.score, 0) DESC, c.created_at ASC, c.id ASC`
    const ranked = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT c.id FROM community_comments c
      LEFT JOIN (SELECT target_id, SUM(value) AS score FROM community_votes WHERE target_type = 'comment' GROUP BY target_id) v ON v.target_id = c.id
      WHERE c.thread_id = ${threadId} ORDER BY ${order} LIMIT ${paging.limit + 1} OFFSET ${paging.skip}`)
    const idsOnPage = ranked.slice(0, paging.limit).map(c => c.id)
    if (paging.page === 1 && focus && focus.length <= 80 && !idsOnPage.includes(focus)) idsOnPage.push(focus)
    const comments = await prisma.communityComment.findMany({
      where: { threadId, id: { in: idsOnPage } }, include: { author: { select: authorSelect } },
    })
    // Include ancestors so any page can render independently, including removed parents.
    const known = new Set(comments.map(c => c.id))
    let missing = [...new Set(comments.flatMap(c => c.parentCommentId && !known.has(c.parentCommentId) ? [c.parentCommentId] : []))]
    while (missing.length) {
      const ancestors = await prisma.communityComment.findMany({ where: { threadId, id: { in: missing } }, include: { author: { select: authorSelect } } })
      missing.forEach(id => known.add(id))
      comments.push(...ancestors)
      missing = [...new Set(ancestors.flatMap(c => c.parentCommentId && !known.has(c.parentCommentId) ? [c.parentCommentId] : []))]
    }
    const ids = comments.filter(c => !c.deleted).map(c => c.id)
    const viewerId = getCurrentUser(request)?.userId
    const [totals, mine, total] = await Promise.all([
      prisma.communityVote.groupBy({ by: ['targetId'], where: { targetType: 'comment', targetId: { in: ids } }, _sum: { value: true } }),
      viewerId ? prisma.communityVote.findMany({ where: { userId: viewerId, targetType: 'comment', targetId: { in: ids } }, select: { targetId: true, value: true } }) : [],
      prisma.communityComment.count({ where: { threadId, deleted: false } }),
    ])
    const scores = new Map(totals.map(v => [v.targetId, v._sum.value || 0]))
    const votes = new Map(mine.map(v => [v.targetId, v.value]))
    const viewerSession = getCurrentUser(request)
    const viewerRole = viewerSession?.role
    const isMod = viewerRole === 'admin' || viewerRole === 'super_admin'
    return NextResponse.json({
      comments: comments.map(c => ({
        id: c.id, parentCommentId: c.parentCommentId, createdAt: c.createdAt, editedAt: c.deleted ? null : c.editedAt, deleted: c.deleted,
        body: c.deleted ? '' : c.body,
        isAnonymous: c.deleted ? false : c.isAnonymous,
        author: c.deleted ? null : (c.isAnonymous ? { id: 'anonymous', name: 'Anonymous', avatar: null } : c.author),
        realAuthor: c.deleted ? null : (c.isAnonymous && isMod ? c.author : null),
        score: c.deleted ? 0 : scores.get(c.id) || 0, viewerVote: c.deleted ? 0 : votes.get(c.id) || 0,
      })), page: paging.page, hasMore: ranked.length > paging.limit, total, locked: thread.locked, acceptedCommentId: thread.acceptedCommentId,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Community comments error:', error)
    return NextResponse.json({ error: 'Unable to load comments. Please try again.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const user = getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Please log in to comment.' }, { status: 401 })
    if (!await canParticipate(user.userId)) return NextResponse.json({ error: 'Account cannot comment.' }, { status: 403 })
    const { threadId } = await context.params
    const body = await request.json().catch(() => null)
    const content = communityText(body?.body, true)
    const parentCommentId = communityText(body?.parentCommentId) || null
    if (content.length < 2 || content.length > 8000 || (parentCommentId && parentCommentId.length > 80)) return NextResponse.json({ error: 'Comments must contain 2–8,000 characters.' }, { status: 400 })
    const limited = await communityLimit(user.userId, 'comment')
    if (limited) return limited
    const comment = await prisma.$transaction(async tx => {
      const thread = await lockThread(tx, threadId)
      if (thread.locked) throw new CommunityError('This discussion is locked. Existing comments are still available.', 409)
      const parent = parentCommentId ? await tx.communityComment.findFirst({ where: { id: parentCommentId, threadId, deleted: false } }) : null
      if (parentCommentId && !parent) throw new CommunityError('The comment you are replying to is no longer available.', 404)
      const created = await tx.communityComment.create({
        data: { threadId, parentCommentId, authorId: user.userId, body: content, isAnonymous: body?.isAnonymous === true }, include: { author: { select: authorSelect } },
      })
      await notifyComment(tx, thread, created, parent?.authorId)
      return created
    })
    const isAnon = comment.isAnonymous
    const isMod = (getCurrentUser(request)?.role ?? '') === 'admin' || (getCurrentUser(request)?.role ?? '') === 'super_admin'
    return NextResponse.json({
      comment: {
        ...comment,
        author: isAnon ? { id: 'anonymous', name: 'Anonymous', avatar: null } : comment.author,
        realAuthor: isAnon && isMod ? comment.author : null,
        isAnonymous: isAnon,
        score: 0, viewerVote: 0,
      }
    }, { status: 201 })
  } catch (error) {
    return mutationError(error)
  }
}
