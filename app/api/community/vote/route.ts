import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canParticipate, communityLimit } from '@/lib/community-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Please log in to vote.' }, { status: 401 })
    if (!await canParticipate(user.userId)) return NextResponse.json({ error: 'Account cannot vote.' }, { status: 403 })
    const body = await request.json().catch(() => null)
    const targetType = body?.targetType === 'thread' ? 'thread' : body?.targetType === 'comment' ? 'comment' : null
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : ''
    const value = body?.value
    if (!targetType || !targetId || targetId.length > 80 || ![-1, 0, 1].includes(value)) return NextResponse.json({ error: 'Invalid vote.' }, { status: 400 })
    const limited = await communityLimit(user.userId, 'vote', 60, 60)
    if (limited) return limited
    const result = await prisma.$transaction(async tx => {
      const target = targetType === 'thread'
        ? await tx.communityThread.findFirst({ where: { id: targetId, deleted: false }, select: { id: true } })
        : await tx.communityComment.findFirst({ where: { id: targetId, deleted: false, thread: { deleted: false } }, select: { id: true } })
      if (!target) return null
      if (value === 0) await tx.communityVote.deleteMany({ where: { userId: user.userId, targetType, targetId } })
      else await tx.communityVote.upsert({
        where: { userId_targetType_targetId: { userId: user.userId, targetType, targetId } },
        create: { userId: user.userId, targetType, targetId, value }, update: { value },
      })
      const total = await tx.communityVote.aggregate({ where: { targetType, targetId }, _sum: { value: true } })
      return { score: total._sum.value || 0, viewerVote: value }
    })
    return result ? NextResponse.json(result) : NextResponse.json({ error: 'This content is no longer available.' }, { status: 404 })
  } catch (error) {
    console.error('Community vote error:', error)
    return NextResponse.json({ error: 'Unable to save your vote. Please try again.' }, { status: 500 })
  }
}
