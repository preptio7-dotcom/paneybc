export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCampaignEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { type } = await request.json()
    const now = new Date()

    let recipients: any[] = []
    let subject = ''
    let body = ''

    if (type === 'onboarding') {
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      recipients = await prisma.user.findMany({ where: { createdAt: { gte: cutoff } } })
      subject = 'Welcome to Preptio'
      body = '<h2>Welcome!</h2><p>Start your first test today and track your progress.</p>'
    } else if (type === 'engagement') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const activeUserIds = await prisma.testResult.findMany({
        where: { createdAt: { gte: cutoff }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      })
      const ids = activeUserIds.map((item) => item.userId).filter(Boolean) as string[]
      recipients = ids.length > 0 ? await prisma.user.findMany({ where: { id: { in: ids } } }) : []
      subject = 'Your Weekly Progress'
      body = '<h2>Keep the momentum!</h2><p>Review your progress and attempt a new mock test this week.</p>'
    } else if (type === 'reengagement') {
      const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const activeUserIds = await prisma.testResult.findMany({
        where: { createdAt: { gte: cutoff }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      })
      const ids = activeUserIds.map((item) => item.userId).filter(Boolean) as string[]
      recipients = await prisma.user.findMany({ where: { id: { notIn: ids } } })
      subject = 'We Miss You'
      body = '<h2>Come back to Preptio</h2><p>New questions and mock exams are ready for you.</p>'
    } else {
      return NextResponse.json({ error: 'Invalid campaign type' }, { status: 400 })
    }

    const results = []
    for (const recipient of recipients) {
      if (!recipient.email) continue
      await sendCampaignEmail(recipient.email, subject, body)
      results.push(recipient.email)
    }

    return NextResponse.json({ sent: results.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

