import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { communityText } from '@/lib/community-input'
import { clearAcceptedAnswer, communityActor, CommunityError, lockThread, mutationError, mutationLimit } from '@/lib/community-mutations'

async function update(request: NextRequest, context: { params: Promise<{ commentId: string }> }, deleted: boolean) {
  try {
    const actor = await communityActor(request)
    const limited = await mutationLimit(actor.id)
    if (limited) return limited
    const { commentId } = await context.params
    const input = deleted ? null : await request.json().catch(() => null)
    const body = communityText(input?.body, true)
    if (!deleted && (body.length < 2 || body.length > 8000)) throw new CommunityError('Comments must contain 2–8,000 characters.', 400)
    const result = await prisma.$transaction(async tx => {
      const initial = await tx.communityComment.findUnique({ where: { id: commentId }, select: { threadId: true } })
      if (!initial) throw new CommunityError('Comment not found.', 404)
      const thread = await lockThread(tx, initial.threadId)
      const comment = await tx.communityComment.findFirst({ where: { id: commentId, deleted: false } })
      if (!comment) throw new CommunityError('Comment not found.', 404)
      if (comment.authorId !== actor.id) throw new CommunityError('Only the author can change this comment.', 403)
      if (!deleted && thread.locked) throw new CommunityError('This discussion is locked.', 409)
      const updated = await tx.communityComment.update({ where: { id: commentId }, data: deleted ? { deleted: true } : { body, editedAt: new Date() } })
      if (deleted) await clearAcceptedAnswer(tx, commentId)
      return { id: updated.id, body: deleted ? '' : updated.body, editedAt: updated.editedAt, deleted, ...(deleted ? { author: null, score: 0, viewerVote: 0 } : {}) }
    })
    return NextResponse.json({ comment: result })
  } catch (error) { return mutationError(error) }
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ commentId: string }> }) { return update(request, context, false) }
export async function DELETE(request: NextRequest, context: { params: Promise<{ commentId: string }> }) { return update(request, context, true) }
