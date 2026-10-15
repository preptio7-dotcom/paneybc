export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCampaignEmail } from '@/lib/email'

async function resolveRecipients(schedule: any): Promise<Array<{ email: string; name?: string }>> {
  const now = new Date()
  const segment = schedule.segment

  if (segment === 'specific_users') {
    const raw = schedule.specificEmails || ''
    const emails = raw
      .split(/[\n,;]+/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 3 && e.includes('@') && !e.includes(' '))
    const uniqueEmails = Array.from(new Set(emails)) as string[]
    return uniqueEmails.map((email) => ({ email }))
  }

  if (segment === 'all_users') {
    const users = await prisma.user.findMany({ select: { email: true, name: true } })
    return users.filter((u) => u.email)
  }

  if (segment === 'new_users') {
    const days = schedule.newWithinDays || 1
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { email: true, name: true },
    })
    return users.filter((u) => u.email)
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
    if (ids.length === 0) return []
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { email: true, name: true },
    })
    return users.filter((u) => u.email)
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
    const users = await prisma.user.findMany({
      where: { id: { notIn: ids } },
      select: { email: true, name: true },
    })
    return users.filter((u) => u.email)
  }

  if (segment === 'exam_prep') {
    const days = schedule.examDaysBefore || 30
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    const users = await prisma.user.findMany({
      where: { examDate: { gte: now, lte: future } },
      select: { email: true, name: true },
    })
    return users.filter((u) => u.email)
  }

  return []
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { scheduleId } = await request.json().catch(() => ({}))
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
      const errors: string[] = []

      for (const recipient of recipients) {
        if (!recipient.email) continue
        try {
          await sendCampaignEmail(recipient.email, template.subject, template.body)
          sentCount += 1
        } catch (err: any) {
          console.error(`Failed to send campaign email to ${recipient.email}:`, err?.message || err)
          errors.push(`${recipient.email}: ${err?.message || 'Send failed'}`)
        }
      }

      totalSent += sentCount
      await prisma.emailSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          sentCount,
          lastError: errors.length > 0 ? errors.slice(0, 5).join('; ') : '',
        },
      })
    }

    return NextResponse.json({ sent: totalSent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
