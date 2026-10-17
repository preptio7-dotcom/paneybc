import { prisma } from '@/lib/prisma'
import { sendRetentionEmail } from '@/lib/email'
import { sendStreakAtRiskPush } from '@/lib/push-notifications'
import {
  countRetentionEmailsSentToday,
  getRetentionDailyEmailLimit,
  startOfTodayUtc,
  STREAK_AT_RISK_EMAIL_KIND,
  STREAK_AT_RISK_PUSH_KIND,
} from '@/lib/email-campaigns'
import { getConfiguredStreakResetTimezone, getDateKeyInTimezone, getDayDiffByDateKey } from '@/lib/streak-settings'
import { STREAK_AT_RISK_TEMPLATE, applyTemplateTokens } from '@/lib/email-templates'

/** Minimum streak length worth protecting with a nudge. */
const MIN_STREAK = 2

/** Creates the editable streak reminder template if it does not exist yet. */
async function getStreakTemplate() {
  const existing = await prisma.emailTemplate.findFirst({ where: { name: STREAK_AT_RISK_TEMPLATE.name } })
  if (existing) return existing
  return prisma.emailTemplate.create({
    data: {
      name: STREAK_AT_RISK_TEMPLATE.name,
      category: STREAK_AT_RISK_TEMPLATE.category as any,
      subject: STREAK_AT_RISK_TEMPLATE.subject,
      body: STREAK_AT_RISK_TEMPLATE.body,
      status: 'active',
    },
  })
}

function firstNameOf(name: string | null | undefined) {
  const first = (name || '').trim().split(/\s+/)[0]
  return first || 'there'
}

async function sendStreakEmail(
  email: string,
  name: string | null,
  streak: number,
  template: { subject: string; body: string }
): Promise<boolean> {
  const vars = { streak: String(streak), name: firstNameOf(name) }
  try {
    await sendRetentionEmail(email, applyTemplateTokens(template.subject, vars), applyTemplateTokens(template.body, vars))
    return true
  } catch (error: any) {
    console.error('[streak-reminders] email fallback failed:', error?.message)
    return false
  }
}

/**
 * Nudges users whose streak is about to break (streak >= 2, practised yesterday,
 * not yet today).
 *
 * Delivery channel:
 *  - users with a push subscription get a web push;
 *  - users without one (or whose push fails to deliver) get an email fallback,
 *    unless `emailFallback: false`.
 *
 * Caps:
 *  - at most ONE nudge per user per day (push or email) — enforced by checking
 *    both notification kinds for today before sending;
 *  - the email fallback also shares the retention daily quota with the
 *    activation drip (campaigns use a separate provider and quota).
 */
export async function sendStreakAtRiskReminders(
  options: { limit?: number; dryRun?: boolean; emailFallback?: boolean; deadline?: number } = {}
) {
  const emailFallback = options.emailFallback !== false
  const now = new Date()
  const timezone = await getConfiguredStreakResetTimezone(prisma)
  const todayKey = getDateKeyInTimezone(now, timezone)

  // Users who have at least one push subscription.
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { not: null } },
    select: { userId: true },
    distinct: ['userId'],
  })
  const pushUserIds = new Set(subscriptions.map((s) => s.userId).filter(Boolean) as string[])

  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
      practiceStreakCurrent: { gte: MIN_STREAK },
      practiceStreakLastDate: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      practiceStreakCurrent: true,
      practiceStreakLastDate: true,
    },
  })

  const atRisk = users.filter((user) => {
    if (!user.practiceStreakLastDate) return false
    const lastKey = getDateKeyInTimezone(user.practiceStreakLastDate, timezone)
    // dayDiff === 1 → last practised yesterday → today is the last chance.
    return getDayDiffByDateKey(lastKey, todayKey) === 1
  })

  const empty = {
    sent: 0,
    pushed: 0,
    emailed: 0,
    candidates: 0,
    skippedCapped: 0,
    todayKey,
    timezone,
  }
  if (atRisk.length === 0) return empty

  // Anyone already nudged today by EITHER channel — this is the daily cap.
  const alreadySent = await prisma.pushNotificationLog.findMany({
    where: {
      kind: { in: [STREAK_AT_RISK_PUSH_KIND, STREAK_AT_RISK_EMAIL_KIND] },
      dayKey: todayKey,
      userId: { in: atRisk.map((u) => u.id) },
    },
    select: { userId: true },
  })
  const sentToday = new Set(alreadySent.map((log) => log.userId))
  const candidates = atRisk.filter((u) => !sentToday.has(u.id))

  // Remaining retention email budget for the day (activation drip + here).
  const since = startOfTodayUtc(now)
  let emailQuota = Math.max(0, getRetentionDailyEmailLimit() - (await countRetentionEmailsSentToday(since)))

  if (options.dryRun) {
    let wouldPush = 0
    let wouldEmail = 0
    for (const user of candidates) {
      if (pushUserIds.has(user.id)) {
        wouldPush += 1
      } else if (emailFallback && wouldEmail < emailQuota) {
        wouldEmail += 1
      }
    }
    return {
      ...empty,
      sent: wouldPush + wouldEmail,
      pushed: wouldPush,
      emailed: wouldEmail,
      candidates: candidates.length,
      skippedCapped: sentToday.size,
      dryRun: true,
    }
  }

  const streakTemplate = emailFallback ? await getStreakTemplate() : null

  const limit = typeof options.limit === 'number' ? Math.max(0, options.limit) : candidates.length
  let pushed = 0
  let emailed = 0
  let stoppedByDeadline = false

  for (const user of candidates) {
    if (pushed + emailed >= limit) break
    if (options.deadline && Date.now() > options.deadline) {
      stoppedByDeadline = true
      break
    }

    let delivered = false
    let kind = STREAK_AT_RISK_PUSH_KIND

    // Prefer push when the user has opted in.
    if (pushUserIds.has(user.id)) {
      delivered = await sendStreakAtRiskPush({ userId: user.id, streak: user.practiceStreakCurrent })
      if (delivered) pushed += 1
    }

    // Email fallback: no push subscription, or push delivery failed.
    if (!delivered && emailFallback && streakTemplate && emailQuota > 0) {
      const ok = await sendStreakEmail(user.email, user.name, user.practiceStreakCurrent, streakTemplate)
      if (ok) {
        delivered = true
        emailed += 1
        emailQuota -= 1
        kind = STREAK_AT_RISK_EMAIL_KIND
      }
    }

    if (delivered) {
      // Record the nudge so no repeat (of either channel) happens today.
      await prisma.pushNotificationLog
        .create({ data: { userId: user.id, kind, dayKey: todayKey } })
        .catch(() => {})
    }
  }

  return {
    ...empty,
    sent: pushed + emailed,
    pushed,
    emailed,
    candidates: candidates.length,
    skippedCapped: sentToday.size,
    stoppedByDeadline,
  }
}
