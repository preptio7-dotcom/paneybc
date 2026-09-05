import { requireAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const targetType = body?.targetType === 'comment' ? 'comment' : body?.targetType === 'thread' ? 'thread' : null
    const actionType = ['delete', 'lock', 'unlock', 'restore'].includes(body?.actionType) ? body.actionType : null
    const targetId = String(body?.targetId || '').trim()
    const reason = String(body?.reason || '').trim().slice(0, 500) || null
    if (!targetType || !actionType || !targetId) return NextResponse.json({ error: 'Target and action are required' }, { status: 400 })

    if (targetType === 'thread') {
      await prisma.communityThread.update({
        where: { id: targetId },
        data: actionType === 'delete' || actionType === 'restore'
          ? { deleted: actionType === 'delete' }
          : { locked: actionType === 'lock' },
      })
    } else {
      await prisma.communityComment.update({
        where: { id: targetId },
        data: { deleted: actionType === 'delete' },
      })
    }

    const action = await prisma.communityModerationAction.create({
      data: { actorId: admin.userId, actionType, targetType, targetId, reason },
    })
    return NextResponse.json({ action })
  } catch (error) {
    console.error('Community moderation error:', error)
    return NextResponse.json({ error: 'Failed to moderate content' }, { status: 500 })
  }
}
