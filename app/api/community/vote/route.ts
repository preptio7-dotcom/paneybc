import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const targetType = body?.targetType === 'comment' ? 'comment' : body?.targetType === 'thread' ? 'thread' : null
    const targetId = String(body?.targetId || '').trim()
    const value = Number(body?.value)
    if (!targetType || !targetId || ![-1, 1].includes(value)) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }

    if (targetType === 'thread') {
      const target = await prisma.communityThread.findFirst({ where: { id: targetId, deleted: false }, select: { id: true } })
      if (!target) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    } else {
      const target = await prisma.communityComment.findFirst({ where: { id: targetId, deleted: false }, select: { id: true } })
      if (!target) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    await prisma.communityVote.upsert({
      where: { userId_targetType_targetId: { userId: user.userId, targetType, targetId } },
      update: { value },
      create: { userId: user.userId, targetType, targetId, value },
    })
    const votes = await prisma.communityVote.findMany({ where: { targetType, targetId }, select: { value: true } })
    return NextResponse.json({ score: votes.reduce((sum, vote) => sum + vote.value, 0), value })
  } catch (error) {
    console.error('Community vote error:', error)
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}
