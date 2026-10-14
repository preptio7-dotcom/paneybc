import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './auth'
import { prisma } from './prisma'
import { communityLimit } from './community-server'

export class CommunityError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
export function mutationError(error: unknown) {
  if (error instanceof CommunityError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('Community update failed:', error)
  return NextResponse.json({ error: 'Unable to save your changes. Please try again.' }, { status: 500 })
}
export async function communityActor(request: NextRequest) {
  const session = getCurrentUser(request)
  if (!session) throw new CommunityError('Please log in to continue.', 401)
  const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, isBanned: true } })
  if (!actor || actor.isBanned) throw new CommunityError('Account cannot participate.', 403)
  return actor
}
export async function mutationLimit(id: string) { return communityLimit(id, 'update', 60, 60) }

// Serialize edits, removal, answers and new comments on the discussion row.
export async function lockThread(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM community_threads WHERE id = ${id} FOR UPDATE`)
  const thread = await tx.communityThread.findFirst({ where: { id, deleted: false } })
  if (!thread) throw new CommunityError('This discussion is no longer available.', 404)
  return thread
}
export async function clearAcceptedAnswer(tx: Prisma.TransactionClient, commentId: string) {
  await tx.communityThread.updateMany({ where: { acceptedCommentId: commentId }, data: { acceptedCommentId: null, solvedAt: null } })
}
export async function lockModerationTarget(tx: Prisma.TransactionClient, targetType: string, targetId: string) {
  const threadId = targetType === 'thread' ? targetId : (await tx.communityComment.findUnique({ where: { id: targetId }, select: { threadId: true } }))?.threadId
  if (!threadId) throw new CommunityError('Content not found.', 404)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM community_threads WHERE id = ${threadId} FOR UPDATE`)
}

export async function notifyComment(tx: Prisma.TransactionClient, thread: { id: string; authorId: string }, comment: { id: string; authorId: string }, parentAuthorId?: string) {
  const followers = await tx.communityFollow.findMany({ where: { threadId: thread.id }, select: { userId: true } })
  const ids = [...new Set([thread.authorId, ...followers.map(f => f.userId), ...(parentAuthorId ? [parentAuthorId] : [])])].filter(id => id !== comment.authorId)
  if (!ids.length) return
  const recipients = await tx.user.findMany({ where: { id: { in: ids }, isBanned: false }, select: { id: true, communityPreferences: true } })
  const data = recipients.flatMap(user => {
    const direct = user.id === parentAuthorId || user.id === thread.authorId
    if (direct ? user.communityPreferences?.replies === false : user.communityPreferences?.followed === false) return []
    return [{ userId: user.id, actorId: comment.authorId, threadId: thread.id, commentId: comment.id, kind: user.id === parentAuthorId ? 'reply' : 'comment' }]
  })
  if (data.length) await tx.communityNotification.createMany({ data, skipDuplicates: true })
}
