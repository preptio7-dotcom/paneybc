import { prisma } from '@/lib/prisma'
import { sendCampaignEmail } from '@/lib/email'

/** Bulk campaign mail (routed to the campaign provider — e.g. Brevo's 300/day). */
export const DEFAULT_CAMPAIGN_DAILY_EMAIL_LIMIT = 300
/** Low-volume retention mail (activation drip + streak reminders) on the default SMTP host. */
export const DEFAULT_RETENTION_DAILY_EMAIL_LIMIT = 100

/**
 * Pause between campaign sends. Bulk providers such as Brevo are built for
 * volume, so the default is short enough that a full audience fits inside a
 * single function invocation. Override with CAMPAIGN_SEND_DELAY_MS.
 */
export function getSendDelayMs(): number {
  const configured = Number(process.env.CAMPAIGN_SEND_DELAY_MS)
  return Number.isFinite(configured) && configured >= 0 ? configured : 250
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Daily cap for bulk campaign mail (all campaigns share one provider allowance). */
export function getCampaignDailyEmailLimit(): number {
  const configured = Number(process.env.CAMPAIGN_DAILY_EMAIL_LIMIT)
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_CAMPAIGN_DAILY_EMAIL_LIMIT
}

/** Daily cap for retention mail (activation drip + streak reminders). */
export function getRetentionDailyEmailLimit(): number {
  const configured = Number(process.env.RETENTION_DAILY_EMAIL_LIMIT)
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_RETENTION_DAILY_EMAIL_LIMIT
}

/**
 * The two notification kinds the streak job writes. Push and email are tracked
 * separately so the retention quota can count emails only, while the
 * (userId, kind, dayKey) uniqueness still caps a user at one nudge a day.
 */
export const STREAK_AT_RISK_PUSH_KIND = 'streak_at_risk'
export const STREAK_AT_RISK_EMAIL_KIND = 'streak_at_risk_email'

/**
 * Counts retention emails already sent today (activation drip + streak email
 * fallback). Campaigns are deliberately excluded: they use a separate provider
 * with its own allowance.
 */
export async function countRetentionEmailsSentToday(since: Date): Promise<number> {
  const [activationSent, streakEmailsSent] = await Promise.all([
    prisma.activationEmailLog.count({ where: { status: 'sent', sentAt: { gte: since } } }),
    prisma.pushNotificationLog.count({ where: { kind: STREAK_AT_RISK_EMAIL_KIND, sentAt: { gte: since } } }),
  ])
  return activationSent + streakEmailsSent
}

/** Start of the current UTC day. The daily quota resets here. */
export function startOfTodayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** True when the SMTP server is refusing mail for rate or quota reasons. */
export function isSmtpRateLimitError(err: any): boolean {
  const code = Number(err?.responseCode ?? err?.code)
  if ([421, 450, 451, 452, 454].includes(code)) return true
  const text = String(err?.response || err?.message || '')
  return /rate|limit|quota|too many|daily|exceeded/i.test(text)
}

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

export async function resolveRecipients(schedule: ScheduleRecord): Promise<Array<{ email: string; name?: string | null }>> {
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

  if (segment === 'never_practiced') {
    // Users who signed up but have never completed a practice test. We resolve
    // the set of users who *have* practised first, then exclude them.
    const practicedRows = await prisma.testResult.findMany({
      where: { userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    })
    const practicedIds = practicedRows.map((row) => row.userId).filter(Boolean) as string[]
    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        ...(practicedIds.length > 0 ? { id: { notIn: practicedIds } } : {}),
      },
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

/**
 * Runs due campaigns. The audience is snapshotted into email_campaign_recipients
 * the first time a campaign runs, so every recipient has a row with a status.
 * Sending stops at the daily cap (CAMPAIGN_DAILY_EMAIL_LIMIT, default 300) or
 * when SMTP reports a rate limit. Unsent rows stay pending and are picked up
 * on the next run. A campaign is marked sent only when no pending rows remain.
 */
export async function processEmailSchedules(options: { scheduleId?: string; sendNow?: boolean; deadline?: number } = {}) {
  const now = new Date()
  const dailyLimit = getCampaignDailyEmailLimit()

  const dueFilter: any = options.scheduleId
    ? { id: options.scheduleId, status: { in: ['scheduled', 'in_progress'] as const } }
    : {
        OR: [
          { status: 'scheduled' as const, sendAt: { lte: now } },
          { status: 'in_progress' as const },
        ],
      }

  const schedules = await prisma.emailSchedule.findMany({ where: dueFilter })
  if (schedules.length === 0) {
    return {
      sent: 0,
      failed: 0,
      processed: 0,
      message: options.scheduleId ? 'Schedule not found or already sent' : 'No schedules due',
    }
  }

  let quotaLeft = Math.max(0, dailyLimit - (await prisma.emailCampaignRecipient.count({
    where: { status: 'sent', sentAt: { gte: startOfTodayUtc(now) } },
  })))
  let stoppedByRateLimit = false
  let stoppedByDeadline = false
  let totalSent = 0
  let totalFailed = 0
  const summaries: Array<{ scheduleId: string; sentThisRun: number; remaining: number; status: string }> = []

  for (const schedule of schedules) {
    const template = await prisma.emailTemplate.findUnique({ where: { id: schedule.templateId } })
    if (!template) {
      await prisma.emailSchedule.update({ where: { id: schedule.id }, data: { lastError: 'Template not found' } })
      totalFailed += 1
      continue
    }

    if (options.sendNow && schedule.status === 'scheduled') {
      await prisma.emailSchedule.update({ where: { id: schedule.id }, data: { sendAt: now } })
    }

    // First run: snapshot the audience into per-recipient rows.
    const existing = await prisma.emailCampaignRecipient.count({ where: { scheduleId: schedule.id } })
    if (existing === 0) {
      const recipients = await resolveRecipients(schedule)
      if (recipients.length === 0) {
        await prisma.emailSchedule.update({
          where: { id: schedule.id },
          data: { lastError: 'No recipients matched this audience' },
        })
        totalFailed += 1
        continue
      }
      await prisma.emailCampaignRecipient.createMany({
        data: recipients
          .filter((r) => r.email)
          .map((r) => ({ scheduleId: schedule.id, email: r.email.trim().toLowerCase(), name: r.name ?? null })),
        skipDuplicates: true,
      })
      await prisma.emailSchedule.update({ where: { id: schedule.id }, data: { status: 'in_progress' } })
    } else if (schedule.status === 'scheduled') {
      await prisma.emailSchedule.update({ where: { id: schedule.id }, data: { status: 'in_progress' } })
    }

    let sentThisRun = 0
    const errors: string[] = []

    if (quotaLeft > 0 && !stoppedByRateLimit) {
      const batch = await prisma.emailCampaignRecipient.findMany({
        where: { scheduleId: schedule.id, status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: quotaLeft,
      })

      for (const recipient of batch) {
        // Leave the rest pending if we are running out of function time.
        if (options.deadline && Date.now() > options.deadline) {
          stoppedByDeadline = true
          break
        }
        try {
          await sendCampaignEmail(recipient.email, template.subject, template.body)
          await prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'sent', sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
          })
          sentThisRun += 1
          quotaLeft -= 1
          await sleep(getSendDelayMs())
        } catch (err: any) {
          const message = err?.message || 'Send failed'
          if (isSmtpRateLimitError(err)) {
            // Leave this recipient pending and stop sending until the next run.
            stoppedByRateLimit = true
            errors.push(`SMTP rate limit reached: ${message}`)
            break
          }
          console.error(`Failed to send campaign email to ${recipient.email}:`, message)
          await prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'failed', attempts: { increment: 1 }, lastError: message.slice(0, 500) },
          })
          totalFailed += 1
          errors.push(`${recipient.email}: ${message}`)
        }
      }
    }

    totalSent += sentThisRun

    const [sentTotal, remaining] = await Promise.all([
      prisma.emailCampaignRecipient.count({ where: { scheduleId: schedule.id, status: 'sent' } }),
      prisma.emailCampaignRecipient.count({ where: { scheduleId: schedule.id, status: 'pending' } }),
    ])

    const done = remaining === 0
    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data: {
        status: done ? 'sent' : 'in_progress',
        sentAt: done ? new Date() : null,
        sentCount: sentTotal,
        lastError: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
      },
    })

    summaries.push({
      scheduleId: schedule.id,
      sentThisRun,
      remaining,
      status: done ? 'sent' : 'in_progress',
    })
  }

  return {
    sent: totalSent,
    failed: totalFailed,
    processed: schedules.length,
    dailyLimit,
    quotaLeftToday: quotaLeft,
    stoppedByRateLimit,
    stoppedByDeadline,
    campaigns: summaries,
  }
}
