import type { PrismaClient } from '@prisma/client'

export type StreakResetTimezone = 'UTC' | 'PKT'

export const DEFAULT_STREAK_RESET_TIMEZONE: StreakResetTimezone = 'UTC'

type AnyRecord = Record<string, unknown>

const CACHE_TTL_MS = 60_000
const PKT_OFFSET_MINUTES = 5 * 60

let cachedTimezone: StreakResetTimezone = DEFAULT_STREAK_RESET_TIMEZONE
let cachedAt = 0

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as AnyRecord
}

export function extractStreakResetTimezone(source: unknown): StreakResetTimezone {
  const root = asRecord(source)
  const raw = root.streakResetTimezone
  if (raw === 'PKT') return 'PKT'
  return 'UTC'
}

export function getTimezoneOffsetMinutes(timezone: StreakResetTimezone) {
  if (timezone === 'PKT') return PKT_OFFSET_MINUTES
  return 0
}

export function getDateKeyInTimezone(
  date: Date = new Date(),
  timezone: StreakResetTimezone = DEFAULT_STREAK_RESET_TIMEZONE
) {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone)
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000)
  return shifted.toISOString().slice(0, 10)
}

export function parseDateKeyToUtcDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`)
}

export function getDayDiffByDateKey(previousKey: string, nextKey: string) {
  const previous = parseDateKeyToUtcDate(previousKey)
  const next = parseDateKeyToUtcDate(nextKey)
  return Math.round((next.getTime() - previous.getTime()) / 86_400_000)
}

export function getStreakResetLabel(timezone: StreakResetTimezone) {
  if (timezone === 'PKT') return '🕛 Streak resets daily at midnight Pakistan Time (PKT)'
  return '🕛 Streak resets daily at midnight UTC'
}

export function invalidateStreakSettingsCache() {
  cachedAt = 0
}

export async function getConfiguredStreakResetTimezone(
  prisma: PrismaClient,
  options?: { bypassCache?: boolean }
) {
  const now = Date.now()
  if (!options?.bypassCache && cachedAt && now - cachedAt < CACHE_TTL_MS) {
    return cachedTimezone
  }

  try {
    const settings = await prisma.systemSettings.findFirst({
      select: { testSettings: true },
    })
    const timezone = extractStreakResetTimezone(settings?.testSettings || {})
    cachedTimezone = timezone
    cachedAt = now
    return timezone
  } catch {
    cachedTimezone = DEFAULT_STREAK_RESET_TIMEZONE
    cachedAt = now
    return DEFAULT_STREAK_RESET_TIMEZONE
  }
}
