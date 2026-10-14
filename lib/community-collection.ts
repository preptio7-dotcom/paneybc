import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'
import { communityActor, CommunityError, lockThread, mutationError, mutationLimit } from './community-mutations'

export async function updateCollection(request: NextRequest, context: { params: Promise<{ threadId: string }> }, collection: 'bookmark' | 'follow') {
  try {
    const actor = await communityActor(request)
    const limited = await mutationLimit(actor.id)
    if (limited) return limited
    const { threadId } = await context.params
    const input = await request.json().catch(() => null)
    const key = collection === 'bookmark' ? 'saved' : 'following'
    const enabled = input?.[key]
    if (typeof enabled !== 'boolean') throw new CommunityError('Invalid collection state.', 400)
    await prisma.$transaction(async tx => {
      await lockThread(tx, threadId)
      const where = { userId: actor.id, threadId }
      if (collection === 'bookmark') {
        if (enabled) await tx.communityBookmark.upsert({ where: { userId_threadId: where }, create: where, update: {} })
        else await tx.communityBookmark.deleteMany({ where })
      } else {
        if (enabled) await tx.communityFollow.upsert({ where: { userId_threadId: where }, create: where, update: {} })
        else await tx.communityFollow.deleteMany({ where })
      }
    })
    return NextResponse.json({ [key]: enabled })
  } catch (error) { return mutationError(error) }
}
