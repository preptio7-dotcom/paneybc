import { prisma } from '@/lib/prisma'
import { sendRetentionEmail } from '@/lib/email'
import { countRetentionEmailsSentToday, getRetentionDailyEmailLimit, startOfTodayUtc } from '@/lib/email-campaigns'
import { ACTIVATION_STEPS, ACTIVATION_TEMPLATES, getActivationTemplate } from '@/lib/email-templates'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Idempotently make sure the four activation templates exist in the database.
 * They are created from the canonical copy in lib/email-templates.ts and can be
 * edited afterwards from the admin panel like any other template.
 */
export async function ensureActivationTemplates() {
  const byStep = new Map<number, { id: string; subject: string; body: string }>()

  for (const { step, template } of ACTIVATION_TEMPLATES) {
    const existing = await prisma.emailTemplate.findFirst({ where: { name: template.name } })
    if (existing) {
      byStep.set(step, existing)
      continue
    }
    const created = await prisma.emailTemplate.create({
      data: {
        name: template.name,
        category: template.category as any,
        subject: template.subject,
        body: template.body,
        status: 'active',
      },
    })
    byStep.set(step, created)
  }

  return byStep
}

/**
 * Sends the Day 0 / 1 / 3 / 7 onboarding sequence to users who signed up but
 * have never attempted a practice test.
 *
 * Each run:
 *  - figures out the highest step each user is now due for,
 *  - skips anyone already logged for that step,
 *  - marks older crossed steps as "skipped" so stale emails never fire later,
 *  - stops entirely for users who have practised (they have a test result),
 *  - respects the shared retention daily quota (with the streak reminders).
 */
export async function processActivationEmails(options: { limit?: number; deadline?: number } = {}) {
  const now = new Date()

  const templates = await ensureActivationTemplates()
  if (templates.size === 0) {
    return { sent: 0, skipped: 0, candidates: 0, quotaLeft: 0, message: 'No activation templates available' }
  }

  const dailyLimit = getRetentionDailyEmailLimit()
  // The activation drip and the streak email fallback share the same SMTP
  // sender, so the daily cap is counted across BOTH streams. Campaigns use a
  // separate provider with its own allowance and are not counted here.
  const since = startOfTodayUtc(now)
  const sentToday = await countRetentionEmailsSentToday(since)

  let quotaLeft = Math.max(0, dailyLimit - sentToday)
  if (typeof options.limit === 'number') {
    quotaLeft = Math.min(quotaLeft, Math.max(0, options.limit))
  }

  // Everyone who has at least one practice result is "activated" and excluded.
  const practicedRows = await prisma.testResult.findMany({
    where: { userId: { not: null } },
    distinct: ['userId'],
    select: { userId: true },
  })
  const practiced = new Set(practicedRows.map((row) => row.userId).filter(Boolean) as string[])

  const users = await prisma.user.findMany({
    where: { isBanned: false },
    // Oldest first: within a shared daily quota, the users closest to churning
    // for good get contacted before newly signed-up ones.
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, createdAt: true },
  })
  const candidates = users.filter((u) => u.email && !practiced.has(u.id))

  const existingLogs = await prisma.activationEmailLog.findMany({
    where: { userId: { in: candidates.map((c) => c.id) } },
    select: { userId: true, step: true },
  })
  const loggedByUser = new Map<string, Set<number>>()
  for (const log of existingLogs) {
    const set = loggedByUser.get(log.userId) ?? new Set<number>()
    set.add(log.step)
    loggedByUser.set(log.userId, set)
  }

  let sent = 0
  let stoppedByDeadline = false
  const nowMs = now.getTime()

  for (const user of candidates) {
    if (quotaLeft <= 0) break
    if (options.deadline && Date.now() > options.deadline) {
      stoppedByDeadline = true
      break
    }

    const ageDays = Math.floor((nowMs - user.createdAt.getTime()) / DAY_MS)
    const applicable = ACTIVATION_STEPS.filter((step) => ageDays >= step)
    if (applicable.length === 0) continue // not due for Day 0 yet

    const target = Math.max(...applicable)
    const done = loggedByUser.get(user.id) ?? new Set<number>()
    if (done.has(target)) continue

    // Record any earlier crossed steps as skipped so we never backfill them.
    const earlier = applicable.filter((step) => step < target && !done.has(step))
    if (earlier.length > 0) {
      await prisma.activationEmailLog.createMany({
        data: earlier.map((step) => ({ userId: user.id, step, status: 'skipped' })),
        skipDuplicates: true,
      })
    }

    const dbTemplate = templates.get(target)
    const fallback = getActivationTemplate(target)
    if (!dbTemplate || !fallback) continue

    const subject = dbTemplate.subject || fallback.subject
    const body = dbTemplate.body || fallback.body

    try {
      await sendRetentionEmail(user.email, subject, body)
      await prisma.activationEmailLog.create({
        data: { userId: user.id, step: target, status: 'sent' },
      })
      sent += 1
      quotaLeft -= 1
    } catch (error: any) {
      console.error(`[activation-emails] failed to send step ${target} to ${user.email}:`, error?.message)
      await prisma.activationEmailLog
        .create({
          data: {
            userId: user.id,
            step: target,
            status: 'failed',
            error: String(error?.message || 'Send failed').slice(0, 400),
          },
        })
        .catch(() => {})
    }
  }

  return {
    sent,
    candidates: candidates.length,
    dailyLimit,
    quotaLeft,
    stoppedByDeadline,
  }
}
