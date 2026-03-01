import type { PrismaClient, UserBadgeType } from '@prisma/client'
import { STREAK_BADGE_DEFINITIONS } from '@/lib/streak-badges'
import {
  DEFAULT_STREAK_RESET_TIMEZONE,
  getConfiguredStreakResetTimezone,
  getDateKeyInTimezone,
  getDayDiffByDateKey,
  parseDateKeyToUtcDate,
  type StreakResetTimezone,
} from '@/lib/streak-settings'

type StreakActionType = 'increment' | 'reset' | 'no_change' | 'first_time'

type StreakTransitionInput = {
  current: number
  best: number
  lastPracticeKey: string | null
  nextPracticeKey: string
}

type StreakTransitionOutput = {
  actionType: StreakActionType
  credited: boolean
  streakBefore: number
  streakAfter: number
  bestBefore: number
  bestAfter: number
}

type StreakUpdateOptions = {
  endpoint?: string
}

function normalizeDateKeys(keys: string[]) {
  return [...new Set(keys.filter(Boolean))].sort()
}

export function getUtcDateKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function resolveStreakTransition(input: StreakTransitionInput): StreakTransitionOutput {
  const current = Math.max(0, Number(input.current) || 0)
  const best = Math.max(0, Number(input.best) || 0)
  const streakBefore = current
  const bestBefore = best

  if (!input.lastPracticeKey) {
    return {
      actionType: 'first_time',
      credited: true,
      streakBefore,
      streakAfter: 1,
      bestBefore,
      bestAfter: Math.max(best, 1),
    }
  }

  if (input.lastPracticeKey === input.nextPracticeKey) {
    return {
      actionType: 'no_change',
      credited: false,
      streakBefore,
      streakAfter: current,
      bestBefore,
      bestAfter: best,
    }
  }

  const dayDiff = getDayDiffByDateKey(input.lastPracticeKey, input.nextPracticeKey)

  if (dayDiff === 1) {
    const nextCurrent = current + 1
    return {
      actionType: 'increment',
      credited: true,
      streakBefore,
      streakAfter: nextCurrent,
      bestBefore,
      bestAfter: Math.max(best, nextCurrent),
    }
  }

  return {
    actionType: 'reset',
    credited: false,
    streakBefore,
    streakAfter: 1,
    bestBefore,
    bestAfter: best,
  }
}

export function isStreakBroken(lastPracticeKey: string | null, todayKey: string) {
  if (!lastPracticeKey) return false
  return getDayDiffByDateKey(lastPracticeKey, todayKey) > 1
}

export function computePracticeStreak(keys: string[]) {
  const normalized = normalizeDateKeys(keys)
  if (!normalized.length) {
    return { current: 0, best: 0, lastPracticeKey: null as string | null }
  }

  let current = 1
  let best = 1
  for (let i = 1; i < normalized.length; i += 1) {
    const diff = getDayDiffByDateKey(normalized[i - 1], normalized[i])
    if (diff === 1) {
      current += 1
    } else {
      current = 1
    }
    best = Math.max(best, current)
  }

  // Current streak should be the trailing consecutive run ending on the latest practice day.
  let trailing = 1
  for (let i = normalized.length - 1; i > 0; i -= 1) {
    const diff = getDayDiffByDateKey(normalized[i - 1], normalized[i])
    if (diff === 1) {
      trailing += 1
    } else {
      break
    }
  }

  return {
    current: trailing,
    best,
    lastPracticeKey: normalized[normalized.length - 1],
  }
}

async function awardMilestoneBadges(
  prisma: PrismaClient,
  userId: string,
  streakAfter: number
) {
  const milestoneTypes = STREAK_BADGE_DEFINITIONS
    .filter((badge) => streakAfter >= badge.milestoneDays)
    .map((badge) => badge.badgeType as UserBadgeType)

  if (!milestoneTypes.length) return [] as UserBadgeType[]

  const existing = await prisma.userBadge.findMany({
    where: {
      userId,
      badgeType: { in: milestoneTypes },
    },
    select: { badgeType: true },
  })
  const existingSet = new Set(existing.map((badge) => badge.badgeType))
  const toCreate = milestoneTypes.filter((badgeType) => !existingSet.has(badgeType))
  if (!toCreate.length) return [] as UserBadgeType[]

  await prisma.userBadge.createMany({
    data: toCreate.map((badgeType) => ({
      userId,
      badgeType,
      seen: false,
    })),
    skipDuplicates: true,
  })

  return toCreate
}

export async function updateUserPracticeStreak(
  prisma: PrismaClient,
  userId: string,
  practiceDate: Date = new Date(),
  options?: StreakUpdateOptions
) {
  const endpoint = options?.endpoint || 'unknown'
  const timezone = await getConfiguredStreakResetTimezone(prisma)
  const dateKey = getDateKeyInTimezone(practiceDate, timezone)
  const creditedDate = parseDateKeyToUtcDate(dateKey)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      practiceStreakCurrent: true,
      practiceStreakBest: true,
      practiceStreakLastDate: true,
    },
  })

  if (!user) return null

  const lastDateKey = user.practiceStreakLastDate
    ? getDateKeyInTimezone(user.practiceStreakLastDate, timezone)
    : null
  const transition = resolveStreakTransition({
    current: user.practiceStreakCurrent,
    best: user.practiceStreakBest,
    lastPracticeKey: lastDateKey,
    nextPracticeKey: dateKey,
  })

  if (transition.actionType !== 'no_change') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        practiceStreakCurrent: transition.streakAfter,
        practiceStreakBest: transition.bestAfter,
        practiceStreakLastDate: practiceDate,
      },
    })
  }

  let awardedBadges: UserBadgeType[] = []
  if (transition.actionType === 'increment' || transition.actionType === 'first_time') {
    awardedBadges = await awardMilestoneBadges(prisma, userId, transition.streakAfter)
  }

  await prisma.streakAuditLog.create({
    data: {
      userId,
      endpoint,
      creditedDate,
      credited: transition.credited,
      actionType: transition.actionType,
      streakBefore: transition.streakBefore,
      streakAfter: transition.streakAfter,
    },
  })

  return {
    current: transition.streakAfter,
    best: transition.bestAfter,
    practicedToday: true,
    lastPracticeKey: dateKey,
    actionType: transition.actionType,
    credited: transition.credited,
    timezone,
    awardedBadges,
  }
}

export async function runDailyStreakReconciliation(
  prisma: PrismaClient,
  now: Date = new Date(),
  options?: { triggeredBy?: 'cron_auto' | 'admin_manual' }
) {
  const triggeredBy = options?.triggeredBy || 'cron_auto'
  const endpointTag =
    triggeredBy === 'admin_manual'
      ? 'daily_reconciliation_job:admin_manual'
      : 'daily_reconciliation_job:cron_auto'

  const timezone = await getConfiguredStreakResetTimezone(prisma, { bypassCache: true })
  const todayKey = getDateKeyInTimezone(now, timezone)
  const creditedDate = parseDateKeyToUtcDate(todayKey)

  const candidates = await prisma.user.findMany({
    where: {
      practiceStreakCurrent: { gt: 0 },
      practiceStreakLastDate: { not: null },
    },
    select: {
      id: true,
      practiceStreakCurrent: true,
      practiceStreakBest: true,
      practiceStreakLastDate: true,
    },
  })

  const affected = candidates.filter((user) => {
    const lastPracticeKey = user.practiceStreakLastDate
      ? getDateKeyInTimezone(user.practiceStreakLastDate, timezone)
      : null
    return isStreakBroken(lastPracticeKey, todayKey)
  })

  for (const user of affected) {
    await prisma.user.update({
      where: { id: user.id },
      data: { practiceStreakCurrent: 0 },
    })
  }

  if (affected.length > 0) {
    await prisma.streakAuditLog.createMany({
      data: affected.map((user) => ({
        userId: user.id,
        endpoint: endpointTag,
        creditedDate,
        credited: false,
        actionType: 'reconciliation_reset',
        streakBefore: user.practiceStreakCurrent,
        streakAfter: 0,
      })),
    })
  }

  return {
    timezone,
    todayKey,
    affectedCount: affected.length,
    triggeredBy,
  }
}

export function getDateKeyForStreak(
  date: Date = new Date(),
  timezone: StreakResetTimezone = DEFAULT_STREAK_RESET_TIMEZONE
) {
  return getDateKeyInTimezone(date, timezone)
}

// Backward-compatible alias for existing imports.
export const getPkDateKey = getUtcDateKey
