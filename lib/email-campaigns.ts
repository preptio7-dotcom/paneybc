import { prisma } from '@/lib/prisma'
import { sendCampaignEmail } from '@/lib/email'

type ScheduleRecord = {
  id: string
  templateId: string
  segment: string
  specificEmails: string | null
  newWithinDays: number
  activeWithinDays: number
  inactiveDays: number
  examDaysBefore: number
}

async function resolveRecipients(schedule: ScheduleRecord): Promise<Array<{ email: string; name?: string | null }>> {
  const now = new Date()
  const segment = schedule.segment

  if (segment === 'specific_users') {
    const raw = schedule.specificEmails || ''
    const emails = raw
      .split(/[\n,;]+/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 3 && e.includes('@') && !e.includes(' '))
    const uniqueEmails = Array.from(new Set(emails))
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

export async function processEmailSchedules(options: { scheduleId?: string; sendNow?: boolean } = {}) {
  const now = new Date()
  const query: { status: 'scheduled'; id?: string; sendAt?: { lte: Date } } = { status: 'scheduled' }

  if (options.scheduleId) {
    query.id = options.scheduleId
  } else {
    query.sendAt = { lte: now }
  }

  const schedules = await prisma.emailSchedule.findMany({ where: query })
  if (schedules.length === 0) {
    return { sent: 0, failed: 0, processed: 0, message: options.scheduleId ? 'Schedule not found or already sent' : 'No schedules due' }
  }

  let totalSent = 0
  let totalFailed = 0

  for (const schedule of schedules) {
    const template = await prisma.emailTemplate.findUnique({ where: { id: schedule.templateId } })
    if (!template) {
      await prisma.emailSchedule.update({
        where: { id: schedule.id },
        data: { lastError: 'Template not found' },
      })
      totalFailed += 1
      continue
    }

    if (options.sendNow) {
      await prisma.emailSchedule.update({
        where: { id: schedule.id },
        data: { sendAt: now },
      })
    }

    const recipients = await resolveRecipients(schedule)
    let sentCount = 0
    const errors: string[] = []

    if (recipients.length === 0) {
      await prisma.emailSchedule.update({
        where: { id: schedule.id },
        data: { lastError: 'No recipients matched this audience' },
      })
      totalFailed += 1
      continue
    }

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
    totalFailed += errors.length

    if (sentCount === 0) {
      await prisma.emailSchedule.update({
        where: { id: schedule.id },
        data: {
          lastError: errors.length > 0 ? errors.slice(0, 5).join('; ') : 'No emails were delivered',
        },
      })
      continue
    }

    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentCount,
        lastError: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      },
    })
  }

  return { sent: totalSent, failed: totalFailed, processed: schedules.length }
}
