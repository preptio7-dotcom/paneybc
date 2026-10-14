export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCampaignEmail } from '@/lib/email'

async function resolveRecipients(schedule: any) {
  const now = new Date()
  const segment = schedule.segment

  if (segment === 'all_users') {
    return prisma.user.findMany()
  }

  if (segment === 'new_users') {
    const days = schedule.newWithinDays || 1
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return prisma.user.findMany({ where: { createdAt: { gte: cutoff } } })
  }

  if (segment === 'active_users') {
    const days = schedule.activeWithinDays || 7
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const activeUserIds = await prisma.testResult.findMany({
      where: { createdAt: { gte: cutoff }, userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    })
    const ids = activeUserIds.map((item) => item.userId).filter(Boolean) as string[]
    return ids.length > 0 ? prisma.user.findMany({ where: { id: { in: ids } } }) : []
  }

  if (segment === 'inactive_users') {
    const days = schedule.inactiveDays || 14
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const activeUserIds = await prisma.testResult.findMany({
      where: { createdAt: { gte: cutoff }, userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    })
    const ids = activeUserIds.map((item) => item.userId).filter(Boolean) as string[]
    return prisma.user.findMany({ where: { id: { notIn: ids } } })
  }

  if (segment === 'exam_prep') {
    const days = schedule.examDaysBefore || 30
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    return prisma.user.findMany({ where: { examDate: { gte: now, lte: future } } })
  }

  return []
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { scheduleId } = await request.json()
    const now = new Date()

    const query: any = { status: 'scheduled' }
    if (scheduleId) {
      query.id = scheduleId
    } else {
      query.sendAt = { lte: now }
    }

    const schedules = await prisma.emailSchedule.findMany({ where: query })
    if (schedules.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No schedules due' })
    }

    let totalSent = 0

    for (const schedule of schedules) {
      const template = await prisma.emailTemplate.findUnique({ where: { id: schedule.templateId } })
      if (!template) {
        await prisma.emailSchedule.update({ where: { id: schedule.id }, data: { lastError: 'Template not found' } })
        continue
      }

      const recipients = await resolveRecipients(schedule)
      let sentCount = 0
      for (const recipient of recipients) {
        if (!recipient.email) continue
        await sendCampaignEmail(recipient.email, template.subject, template.body)
        sentCount += 1
      }

      totalSent += sentCount
      await prisma.emailSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          sentCount,
          lastError: '',
        },
      })
    }

    return NextResponse.json({ sent: totalSent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

