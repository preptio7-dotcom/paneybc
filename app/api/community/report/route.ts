import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enforceCommunityCooldown } from '@/lib/community-markdown'
import { NextRequest, NextResponse } from 'next/server'

function text(value: unknown, max: number) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max)
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!enforceCommunityCooldown(user.userId, 'report', 5_000)) {
      return NextResponse.json({ error: 'Please wait before submitting another report' }, { status: 429 })
    }

    const body = await request.json()
    const targetType = body?.targetType === 'comment' ? 'comment' : body?.targetType === 'thread' ? 'thread' : null
    const targetId = String(body?.targetId || '').trim()
    const reason = text(body?.reason, 1000)

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ error: 'Target type, target ID, and reason are required' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, isBanned: true },
    })
    if (!dbUser || dbUser.isBanned) {
      return NextResponse.json({ error: 'Account cannot report content' }, { status: 403 })
    }

    if (targetType === 'thread') {
      const target = await prisma.communityThread.findFirst({
        where: { id: targetId, deleted: false },
        select: { id: true },
      })
      if (!target) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    } else {
      const target = await prisma.communityComment.findFirst({
        where: { id: targetId, deleted: false },
        select: { id: true },
      })
      if (!target) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const existingReport = await prisma.communityReport.findFirst({
      where: {
        reporterId: user.userId,
        targetType,
        targetId,
        status: 'open',
      },
    })
    if (existingReport) {
      return NextResponse.json({ message: 'Report already submitted', report: existingReport }, { status: 200 })
    }

    const report = await prisma.communityReport.create({
      data: {
        reporterId: user.userId,
        targetType,
        targetId,
        reason,
        status: 'open',
      },
    })

    return NextResponse.json({ success: true, report }, { status: 201 })
  } catch (error) {
    console.error('Community report error:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reports = await prisma.communityReport.findMany({
      where: { reporterId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Community user reports error:', error)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}
