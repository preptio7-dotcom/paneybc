import { getCurrentUser } from '@/lib/auth'
import { threadResults } from '@/lib/community-server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { communityText } from '@/lib/community-input'
import { isPostType } from '@/lib/community-options'
import { communityActor, CommunityError, lockThread, mutationError, mutationLimit } from '@/lib/community-mutations'

export async function GET(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await context.params
    const [thread] = await threadResults([threadId], getCurrentUser(request)?.userId)
    if (!thread) return NextResponse.json({ error: 'This discussion was removed or is no longer available.' }, { status: 404 })
    return NextResponse.json({ thread }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Community discussion error:', error)
    return NextResponse.json({ error: 'Unable to load this discussion. Please try again.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const actor = await communityActor(request)
    const limited = await mutationLimit(actor.id)
    if (limited) return limited
    const { threadId } = await context.params
    const input = await request.json().catch(() => null)
    await prisma.$transaction(async tx => {
      const thread = await lockThread(tx, threadId)
      if (input?.action === 'pin') {
        if (!['admin', 'super_admin'].includes(actor.role)) throw new CommunityError('Only moderators can pin discussions.', 403)
        if (typeof input.pinned !== 'boolean') throw new CommunityError('Invalid pin state.', 400)
        await tx.communityThread.update({ where: { id: threadId }, data: { pinnedAt: input.pinned ? new Date() : null } })
        await tx.communityModerationAction.create({ data: { actorId: actor.id, actionType: input.pinned ? 'pin' : 'unpin', targetType: 'thread', targetId: threadId } })
        return
      }
      if (thread.authorId !== actor.id) throw new CommunityError('Only the author can change this discussion.', 403)
      if (thread.locked) throw new CommunityError('This discussion is locked.', 409)
      if (input?.action === 'solve' || input?.action === 'accept') {
        if (thread.postType !== 'question') throw new CommunityError('Only questions can be marked solved.', 400)
        if (input.action === 'solve' && typeof input.solved !== 'boolean') throw new CommunityError('Invalid solved state.', 400)
        let acceptedCommentId: string | null = null
        if (input.action === 'accept') {
          if (typeof input.commentId !== 'string') throw new CommunityError('Choose an answer.', 400)
          const comment = await tx.communityComment.findFirst({ where: { id: input.commentId, threadId, deleted: false } })
          if (!comment) throw new CommunityError('This answer is no longer available.', 404)
          acceptedCommentId = comment.id
          if (comment.authorId !== actor.id) {
            const preference = await tx.communityPreferences.findUnique({ where: { userId: comment.authorId } })
            if (preference?.replies !== false) await tx.communityNotification.createMany({ data: [{ userId: comment.authorId, actorId: actor.id, threadId, commentId: comment.id, kind: 'accepted_answer' }], skipDuplicates: true })
          }
        }
        await tx.communityThread.update({ where: { id: threadId }, data: { acceptedCommentId, solvedAt: input.action === 'accept' || input.solved ? new Date() : null } })
        return
      }
      if (input?.action !== 'edit') throw new CommunityError('Invalid discussion action.', 400)
      const title = communityText(input.title), body = communityText(input.body, true), categoryId = communityText(input.categoryId)
      if (title.length < 5 || title.length > 160 || body.length < 10 || body.length > 10000 || !isPostType(input.postType) || !categoryId || categoryId.length > 80) throw new CommunityError('Choose a subject and label, a title of 5–160 characters and a post of 10–10,000 characters.', 400)
      if (!await tx.communityCategory.findUnique({ where: { id: categoryId } })) throw new CommunityError('Subject not found.', 404)
      await tx.communityThread.update({ where: { id: threadId }, data: { title, body, categoryId, postType: input.postType, editedAt: new Date(), ...(input.postType !== 'question' ? { acceptedCommentId: null, solvedAt: null } : {}) } })
    })
    const [thread] = await threadResults([threadId], actor.id)
    return NextResponse.json({ thread })
  } catch (error) { return mutationError(error) }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const actor = await communityActor(request)
    const limited = await mutationLimit(actor.id)
    if (limited) return limited
    const { threadId } = await context.params
    await prisma.$transaction(async tx => {
      const thread = await lockThread(tx, threadId)
      if (thread.authorId !== actor.id) throw new CommunityError('Only the author can delete this discussion.', 403)
      await tx.communityThread.update({ where: { id: threadId }, data: { deleted: true, acceptedCommentId: null, solvedAt: null } })
    })
    return NextResponse.json({ deleted: true })
  } catch (error) { return mutationError(error) }
}
