import { BlogAnalyticsEventType, UserRole, type PrismaClient } from '@prisma/client'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const PKT_OFFSET_MS = 5 * HOUR_MS

const HEAVY_CACHE_TTL_MS = 60 * 60 * 1000
const LEADERBOARD_CACHE_TTL_MS = 15 * 60 * 1000

const SUBJECT_ORDER = ['FOA', 'BAEIVI', 'BAEIV2E', 'QAFB'] as const
const SOURCE_ORDER = ['direct', 'google', 'whatsapp', 'instagram', 'facebook', 'other'] as const

type SubjectCode = (typeof SUBJECT_ORDER)[number]

export type AdminRangePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'all' | 'custom'

type DateRange = {
  preset: AdminRangePreset
  from: Date
  to: Date
  previousFrom: Date
  previousTo: Date
  label: string
  startInput: string
  endInput: string
}

type KpiCard = {
  label: string
  value: number
  valueText: string
  subtext: string
  trendDirection: 'up' | 'down' | 'flat'
  trendText: string
}

type LeaderboardRow = {
  rank: number
  userId: string
  displayName: string
  streak: number
  subjects: string
  accuracy: number
}

type LiveEvent = {
  id: string
  icon: string
  message: string
  subtext: string
  timestamp: string
  timestampLabel: string
}

export type LeaderboardPayload = {
  current: LeaderboardRow[]
  best: LeaderboardRow[]
  distribution: Array<{ label: string; percent: number; count: number }>
}

export type AdminAnalyticsHeavyPayload = {
  generatedAt: string
  range: {
    preset: AdminRangePreset
    label: string
    from: string
    to: string
    startInput: string
    endInput: string
  }
  kpis: {
    activeUsers: KpiCard
    newSignups: KpiCard
    questionsAnswered: KpiCard
    mockTestsCompleted: KpiCard
    averageSessionLength: KpiCard
    streakLeader: KpiCard
  }
  activeUsersChart: {
    points: Array<{ dayKey: string; label: string; dau: number; wau: number; mau: number; newSignups: number }>
    pills: { today: number; yesterday: number; peak: { dayKey: string; count: number } }
  }
  retention: {
    cohorts: Array<{ weekLabel: string; d1: number | null; d7: number | null; d30: number | null }>
    summary: { day1: number; day7: number; day30: number; atRiskCount: number }
  }
  subjectPerformance: {
    usage: Array<{ subjectCode: string; subjectName: string; color: string; attempts: number; accuracy: number }>
    insights: { mostPracticed: string; highestAccuracy: string; needsAttention: string }
  }
  peakUsage: {
    cells: Array<{ day: number; hour: number; count: number }>
    insights: { peakTimeLabel: string; peakTimeCount: number; mostActiveDay: string; nightOwlPercent: number; earlyBirdPercent: number }
  }
  signupSources: {
    total: number
    rows: Array<{ source: string; count: number; percent: number }>
    insight: string
  }
  deviceUsage: {
    mobile: number
    desktop: number
    tablet: number
    browsers: Array<{ browser: string; percent: number }>
    insight: string
  }
  mockAnalytics: {
    rows: Array<{ testType: 'bae_mock' | 'foa_mock' | 'qafb_mock'; label: string; attempts: number; completed: number; passRate: number; avgScore: number }>
    trend: Array<{ dayKey: string; bae: number; foa: number; qafb: number }>
    insights: string[]
  }
  geography: {
    rows: Array<{ rank: number; city: string; students: number; percent: number; medal: 'gold' | 'silver' | 'bronze' | null }>
    insight: string
  }
  adsense: {
    manual: { thisMonthPkr: number; lastMonthPkr: number; history: Array<{ monthKey: string; valuePkr: number }>; updatedAt: string | null }
    estimate: { rpmUsd: number; pageViews: number; estimatedUsd: number }
  }
  platformStatsJob: {
    status: 'success' | 'failed' | null
    runAt: string | null
    error: string | null
  }
}

export type AdminAnalyticsReportPayload = {
  heavy: AdminAnalyticsHeavyPayload
  leaderboard: LeaderboardPayload
  liveActivity: { events: LiveEvent[]; refreshedAt: string }
}

const heavyCache = new Map<string, { expiresAt: number; value: AdminAnalyticsHeavyPayload }>()
const leaderboardCache = new Map<string, { expiresAt: number; value: LeaderboardPayload }>()

function dayInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function asPercent(part: number, total: number) {
  if (total <= 0) return 0
  return (part / total) * 100
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function trend(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) return { trendDirection: 'flat' as const, trendText: 'No change vs previous period' }
    return { trendDirection: 'up' as const, trendText: `+${current} vs previous period` }
  }
  const delta = current - previous
  if (delta === 0) return { trendDirection: 'flat' as const, trendText: 'No change vs previous period' }
  const pct = (Math.abs(delta) / previous) * 100
  return {
    trendDirection: delta > 0 ? ('up' as const) : ('down' as const),
    trendText: `${delta > 0 ? '+' : '-'}${pct.toFixed(1)}% vs previous period`,
  }
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${Math.round(value)}`
}

function normalizeSubject(input: string | null | undefined): SubjectCode | null {
  const value = String(input || '').trim().toUpperCase()
  if (!value) return null
  if (value === 'BAEIVII') return 'BAEIVI'
  if (value === 'BAEIVI' || value === 'BAEIV2E' || value === 'FOA' || value === 'QAFB') return value as SubjectCode
  return null
}

function detectSource(referrer: string | null | undefined): (typeof SOURCE_ORDER)[number] {
  const value = String(referrer || '').toLowerCase()
  if (!value) return 'direct'
  if (value.includes('google')) return 'google'
  if (value.includes('whatsapp') || value.includes('wa.me')) return 'whatsapp'
  if (value.includes('instagram') || value.includes('ig')) return 'instagram'
  if (value.includes('facebook') || value.includes('fb.com')) return 'facebook'
  return 'other'
}

function detectDevice(userAgent: string | null | undefined): 'mobile' | 'desktop' | 'tablet' {
  const ua = String(userAgent || '').toLowerCase()
  if (!ua) return 'desktop'
  if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile'
  return 'desktop'
}

function detectBrowser(userAgent: string | null | undefined) {
  const ua = String(userAgent || '').toLowerCase()
  if (!ua) return 'Other'
  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('chrome')) return 'Chrome'
  return 'Other'
}

function pktDayHour(date: Date) {
  const shifted = new Date(date.getTime() + PKT_OFFSET_MS)
  const weekDay = shifted.getUTCDay()
  return {
    day: (weekDay + 6) % 7,
    hour: shifted.getUTCHours(),
  }
}

function buildRangeLabel(from: Date, to: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt.format(from)} -> ${fmt.format(to)}`
}

function parsePreset(value: string | null): AdminRangePreset {
  if (!value) return '30d'
  if (value === 'today' || value === 'yesterday' || value === '7d' || value === '30d' || value === '90d' || value === 'all' || value === 'custom') {
    return value
  }
  return '30d'
}

export function parseAdminAnalyticsRange(searchParams: URLSearchParams): DateRange {
  const now = new Date()
  const preset = parsePreset(searchParams.get('preset'))

  if (preset === 'custom') {
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const from = start ? new Date(`${start}T00:00:00.000Z`) : null
    const to = end ? new Date(`${end}T23:59:59.999Z`) : null
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return parseAdminAnalyticsRange(new URLSearchParams('preset=30d'))
    }
    const safeFrom = from <= to ? from : to
    const safeTo = from <= to ? to : from
    const span = Math.max(DAY_MS, safeTo.getTime() - safeFrom.getTime() + 1)
    return {
      preset,
      from: safeFrom,
      to: safeTo,
      previousTo: new Date(safeFrom.getTime() - 1),
      previousFrom: new Date(safeFrom.getTime() - span),
      label: buildRangeLabel(safeFrom, safeTo),
      startInput: dayInput(safeFrom),
      endInput: dayInput(safeTo),
    }
  }

  if (preset === 'all') {
    const from = new Date('2020-01-01T00:00:00.000Z')
    return {
      preset,
      from,
      to: now,
      previousFrom: new Date('2019-01-01T00:00:00.000Z'),
      previousTo: new Date(from.getTime() - 1),
      label: 'All time',
      startInput: dayInput(from),
      endInput: dayInput(now),
    }
  }

  const days = preset === 'today' ? 1 : preset === 'yesterday' ? 1 : preset === '7d' ? 7 : preset === '90d' ? 90 : 30
  let from: Date
  let to: Date
  if (preset === 'today') {
    from = startOfDay(now)
    to = endOfDay(now)
  } else if (preset === 'yesterday') {
    const yesterday = new Date(now.getTime() - DAY_MS)
    from = startOfDay(yesterday)
    to = endOfDay(yesterday)
  } else {
    from = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS))
    to = endOfDay(now)
  }

  const span = Math.max(DAY_MS, to.getTime() - from.getTime() + 1)
  const previousTo = new Date(from.getTime() - 1)
  const previousFrom = new Date(previousTo.getTime() - span + 1)
  const labels: Record<Exclude<AdminRangePreset, 'custom'>, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    all: 'All time',
  }
  return {
    preset,
    from,
    to,
    previousFrom,
    previousTo,
    label: labels[preset as Exclude<AdminRangePreset, 'custom'>],
    startInput: dayInput(from),
    endInput: dayInput(to),
  }
}

function cacheKey(range: DateRange) {
  return `${range.from.toISOString()}::${range.to.toISOString()}`
}

function fromCache<T>(cache: Map<string, { expiresAt: number; value: T }>, key: string): T | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function toCache<T>(cache: Map<string, { expiresAt: number; value: T }>, key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function shortName(value: string | null | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return 'Student'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readAdsenseSettings(testSettings: Record<string, unknown>) {
  const raw = asRecord(testSettings.adminAnalyticsAdsense)
  const parseAmount = (value: unknown) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return Math.max(0, parsed)
  }
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .map((row) => {
      const record = asRecord(row)
      const monthKey = String(record.monthKey || '').trim()
      if (!/^\d{4}-\d{2}$/.test(monthKey)) return null
      return { monthKey, valuePkr: parseAmount(record.valuePkr) }
    })
    .filter((row): row is { monthKey: string; valuePkr: number } => Boolean(row))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  return {
    thisMonthPkr: parseAmount(raw.thisMonthPkr),
    lastMonthPkr: parseAmount(raw.lastMonthPkr),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
    history,
  }
}

function averageNullable(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null)
  if (!filtered.length) return 0
  return round1(filtered.reduce((sum, value) => sum + value, 0) / filtered.length)
}

function sourceInsight(source: string) {
  if (source === 'whatsapp') return 'WhatsApp is your top growth channel. Keep sharing in student groups.'
  if (source === 'google') return 'Google search is strong. Keep publishing SEO-friendly content.'
  if (source === 'instagram') return 'Instagram is performing well. Keep posting short-value content.'
  return 'Direct traffic is healthy. Keep strengthening brand recall.'
}

function relativeTime(date: Date, now = new Date()) {
  const diffMs = now.getTime() - date.getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function buildDateKeys(from: Date, to: Date) {
  const keys: string[] = []
  let cursor = startOfDay(from)
  const end = endOfDay(to)
  while (cursor.getTime() <= end.getTime()) {
    keys.push(dayKey(cursor))
    cursor = new Date(cursor.getTime() + DAY_MS)
  }
  return keys
}

function mockLabel(testType: string) {
  if (testType === 'foa_mock') return 'FOA Mock'
  if (testType === 'qafb_mock') return 'QAFB Mock'
  return 'BAE Mock'
}

async function buildHeavyPayload(prisma: PrismaClient, range: DateRange): Promise<AdminAnalyticsHeavyPayload> {
  const [results, mocks, signups, analyticsRows, studySessions, settings, previousResults, previousMocks, previousSignups] = await Promise.all([
    prisma.testResult.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { userId: true, subject: true, totalQuestions: true, correctAnswers: true, duration: true, createdAt: true, score: true },
    }),
    prisma.baeMockSession.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: {
        userId: true,
        testType: true,
        totalQuestions: true,
        correctAnswers: true,
        completed: true,
        scorePercent: true,
        timeAllowed: true,
        timeTaken: true,
        vol1Count: true,
        vol2Count: true,
        vol1Correct: true,
        vol2Correct: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { role: UserRole.student, createdAt: { gte: range.from, lte: range.to } },
      select: { id: true, createdAt: true },
    }),
    prisma.analytics.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { path: true, referrer: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.studySession.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { minutes: true },
    }),
    prisma.systemSettings.findFirst({ select: { testSettings: true } }),
    prisma.testResult.findMany({
      where: { createdAt: { gte: range.previousFrom, lte: range.previousTo } },
      select: { userId: true, totalQuestions: true },
    }),
    prisma.baeMockSession.findMany({
      where: { createdAt: { gte: range.previousFrom, lte: range.previousTo } },
      select: { userId: true, totalQuestions: true, completed: true, scorePercent: true, testType: true },
    }),
    prisma.user.count({
      where: { role: UserRole.student, createdAt: { gte: range.previousFrom, lte: range.previousTo } },
    }),
  ])

  const activeUsers = new Set<string>()
  const previousActiveUsers = new Set<string>()
  let questionsAnswered = 0
  let previousQuestionsAnswered = 0

  const subjectStats: Record<SubjectCode, { attempts: number; correct: number }> = {
    FOA: { attempts: 0, correct: 0 },
    BAEIVI: { attempts: 0, correct: 0 },
    BAEIV2E: { attempts: 0, correct: 0 },
    QAFB: { attempts: 0, correct: 0 },
  }

  const dayKeys = buildDateKeys(range.from, range.to)
  const activityByDay = new Map<string, Set<string>>()
  const signupsByDay = new Map<string, number>()
  const usageHeat = new Map<string, number>()
  dayKeys.forEach((key) => {
    activityByDay.set(key, new Set<string>())
    signupsByDay.set(key, 0)
  })

  signups.forEach((user) => {
    const key = dayKey(user.createdAt)
    signupsByDay.set(key, (signupsByDay.get(key) || 0) + 1)
  })

  for (const row of results) {
    if (row.userId) {
      activeUsers.add(row.userId)
      const key = dayKey(row.createdAt)
      if (!activityByDay.has(key)) activityByDay.set(key, new Set<string>())
      activityByDay.get(key)?.add(row.userId)
    }

    questionsAnswered += Math.max(0, row.totalQuestions || 0)

    const subjectCode = normalizeSubject(row.subject)
    if (subjectCode) {
      subjectStats[subjectCode].attempts += Math.max(0, row.totalQuestions || 0)
      subjectStats[subjectCode].correct += Math.max(0, row.correctAnswers || 0)
    }

    const pkt = pktDayHour(row.createdAt)
    const heatKey = `${pkt.day}-${pkt.hour}`
    usageHeat.set(heatKey, (usageHeat.get(heatKey) || 0) + Math.max(1, row.totalQuestions || 1))
  }

  for (const row of mocks) {
    activeUsers.add(row.userId)
    const key = dayKey(row.createdAt)
    if (!activityByDay.has(key)) activityByDay.set(key, new Set<string>())
    activityByDay.get(key)?.add(row.userId)

    questionsAnswered += Math.max(0, row.totalQuestions || 0)
    if (row.testType === 'bae_mock') {
      subjectStats.BAEIVI.attempts += Math.max(0, row.vol1Count || 0)
      subjectStats.BAEIVI.correct += Math.max(0, row.vol1Correct || 0)
      subjectStats.BAEIV2E.attempts += Math.max(0, row.vol2Count || 0)
      subjectStats.BAEIV2E.correct += Math.max(0, row.vol2Correct || 0)
    } else if (row.testType === 'foa_mock') {
      subjectStats.FOA.attempts += Math.max(0, row.totalQuestions || 0)
      subjectStats.FOA.correct += Math.max(0, row.correctAnswers || 0)
    } else if (row.testType === 'qafb_mock') {
      subjectStats.QAFB.attempts += Math.max(0, row.totalQuestions || 0)
      subjectStats.QAFB.correct += Math.max(0, row.correctAnswers || 0)
    }

    const pkt = pktDayHour(row.createdAt)
    const heatKey = `${pkt.day}-${pkt.hour}`
    usageHeat.set(heatKey, (usageHeat.get(heatKey) || 0) + Math.max(1, row.totalQuestions || 1))
  }

  previousResults.forEach((row) => {
    if (row.userId) previousActiveUsers.add(row.userId)
    previousQuestionsAnswered += Math.max(0, row.totalQuestions || 0)
  })
  previousMocks.forEach((row) => {
    if (row.userId) previousActiveUsers.add(row.userId)
    previousQuestionsAnswered += Math.max(0, row.totalQuestions || 0)
  })

  const activeCount = activeUsers.size
  const previousActiveCount = previousActiveUsers.size
  const activeTrend = trend(activeCount, previousActiveCount)
  const signupTrend = trend(signups.length, previousSignups)
  const questionsTrend = trend(questionsAnswered, previousQuestionsAnswered)

  const completedMocks = mocks.filter((row) => row.completed)
  const previousCompletedMocks = previousMocks.filter((row) => row.completed)
  const mockTrendStats = trend(completedMocks.length, previousCompletedMocks.length)
  const mockPassRate = round1(asPercent(completedMocks.filter((row) => row.scorePercent >= 60).length, Math.max(1, completedMocks.length)))

  let avgSessionMinutes = 0
  if (studySessions.length > 0) {
    avgSessionMinutes = studySessions.reduce((sum, row) => sum + Math.max(0, row.minutes), 0) / studySessions.length
  } else {
    const duration = results.reduce((sum, row) => sum + Math.max(0, row.duration || 0), 0)
    const mockDuration = mocks.reduce((sum, row) => sum + Math.max(0, row.timeTaken || row.timeAllowed || 0), 0)
    const sessions = results.length + mocks.length
    avgSessionMinutes = sessions > 0 ? (duration + mockDuration) / sessions / 60 : 0
  }

  const previousStudy = await prisma.studySession.findMany({
    where: { createdAt: { gte: range.previousFrom, lte: range.previousTo } },
    select: { minutes: true },
  })
  const previousAvgSession = previousStudy.length > 0 ? previousStudy.reduce((sum, row) => sum + Math.max(0, row.minutes), 0) / previousStudy.length : 0
  const sessionTrendStats = trend(avgSessionMinutes, previousAvgSession)

  const [topStreakUser, previousTopStreakUser] = await Promise.all([
    prisma.user.findFirst({
      where: { role: UserRole.student },
      orderBy: [{ practiceStreakCurrent: 'desc' }, { updatedAt: 'desc' }],
      select: { practiceStreakCurrent: true },
    }),
    prisma.user.findFirst({
      where: { role: UserRole.student, updatedAt: { gte: range.previousFrom, lte: range.previousTo } },
      orderBy: [{ practiceStreakCurrent: 'desc' }, { updatedAt: 'desc' }],
      select: { practiceStreakCurrent: true },
    }),
  ])
  const currentStreakLeader = topStreakUser?.practiceStreakCurrent || 0
  const previousStreakLeader = previousTopStreakUser?.practiceStreakCurrent || 0
  const streakTrend = trend(currentStreakLeader, previousStreakLeader)

  const chartPoints = dayKeys.map((key, index) => {
    const current = activityByDay.get(key) || new Set<string>()
    const wau = new Set<string>()
    const mau = new Set<string>()
    for (let cursor = Math.max(0, index - 6); cursor <= index; cursor += 1) {
      ;(activityByDay.get(dayKeys[cursor]) || new Set<string>()).forEach((id) => wau.add(id))
    }
    for (let cursor = Math.max(0, index - 29); cursor <= index; cursor += 1) {
      ;(activityByDay.get(dayKeys[cursor]) || new Set<string>()).forEach((id) => mau.add(id))
    }
    return {
      dayKey: key,
      label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${key}T00:00:00.000Z`)),
      dau: current.size,
      wau: wau.size,
      mau: mau.size,
      newSignups: signupsByDay.get(key) || 0,
    }
  })

  const todayKey = dayKey(endOfDay(range.to))
  const yesterdayKey = dayKey(new Date(endOfDay(range.to).getTime() - DAY_MS))
  const peakPoint = chartPoints.reduce((best, row) => (row.dau > best.dau ? row : best), chartPoints[0] || { dayKey: todayKey, dau: 0, wau: 0, mau: 0, newSignups: 0, label: '' })

  const userSignupMap = new Map(signups.map((user) => [user.id, startOfDay(user.createdAt)]))
  const signupIds = signups.map((user) => user.id)
  const retentionActivity = signupIds.length
    ? await Promise.all([
        prisma.testResult.findMany({
          where: { userId: { in: signupIds }, createdAt: { gte: range.from, lte: new Date(Math.min(Date.now(), range.to.getTime() + 30 * DAY_MS)) } },
          select: { userId: true, createdAt: true },
        }),
        prisma.baeMockSession.findMany({
          where: { userId: { in: signupIds }, createdAt: { gte: range.from, lte: new Date(Math.min(Date.now(), range.to.getTime() + 30 * DAY_MS)) } },
          select: { userId: true, createdAt: true },
        }),
      ])
    : [[], []]

  const returnDiffMap = new Map<string, Set<number>>()
  ;[...retentionActivity[0], ...retentionActivity[1]].forEach((row) => {
    const userId = row.userId || null
    if (!userId) return
    const signupDate = userSignupMap.get(userId)
    if (!signupDate) return
    const diff = Math.floor((startOfDay(row.createdAt).getTime() - signupDate.getTime()) / DAY_MS)
    if (diff <= 0) return
    const set = returnDiffMap.get(userId) || new Set<number>()
    set.add(diff)
    returnDiffMap.set(userId, set)
  })

  const cohortsMap = new Map<string, string[]>()
  signups.forEach((user) => {
    const mondayKey = (() => {
      const day = startOfDay(user.createdAt)
      const weekday = day.getUTCDay()
      const delta = weekday === 0 ? -6 : 1 - weekday
      return dayKey(new Date(day.getTime() + delta * DAY_MS))
    })()
    const existing = cohortsMap.get(mondayKey) || []
    existing.push(user.id)
    cohortsMap.set(mondayKey, existing)
  })

  const retentionCohorts = Array.from(cohortsMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekKey, users]) => {
      const weekDate = new Date(`${weekKey}T00:00:00.000Z`)
      const weekLabel = `${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(weekDate)} W${Math.floor((weekDate.getUTCDate() - 1) / 7) + 1}`
      const ageDays = Math.floor((Date.now() - weekDate.getTime()) / DAY_MS)
      const scoreForWindow = (windowDays: number) => {
        if (ageDays < windowDays) return null
        const returned = users.filter((userId) => {
          const diffs = returnDiffMap.get(userId)
          if (!diffs) return false
          for (const diff of diffs) {
            if (diff <= windowDays) return true
          }
          return false
        }).length
        return round1(asPercent(returned, Math.max(1, users.length)))
      }
      return {
        weekLabel,
        d1: scoreForWindow(1),
        d7: scoreForWindow(7),
        d30: scoreForWindow(30),
      }
    })

  const retentionSummary = {
    day1: averageNullable(retentionCohorts.map((row) => row.d1)),
    day7: averageNullable(retentionCohorts.map((row) => row.d7)),
    day30: averageNullable(retentionCohorts.map((row) => row.d30)),
  }

  const atRiskCount = await prisma.user.count({
    where: {
      role: UserRole.student,
      practiceStreakCurrent: { gt: 0 },
      practiceStreakLastDate: { lt: new Date(Date.now() - 7 * DAY_MS) },
    },
  })

  const subjectUsage = SUBJECT_ORDER.map((code) => {
    const meta = {
      FOA: { name: 'Fundamentals of Accounting', color: '#7c3aed' },
      BAEIVI: { name: 'Business & Economic Insights Vol I', color: '#16a34a' },
      BAEIV2E: { name: 'Business & Economic Insights Vol II', color: '#2563eb' },
      QAFB: { name: 'Quantitative Analysis for Business', color: '#ea580c' },
    }[code]
    const attempts = subjectStats[code].attempts
    const accuracy = attempts > 0 ? round1(asPercent(subjectStats[code].correct, attempts)) : 0
    return { subjectCode: code, subjectName: meta.name, color: meta.color, attempts, accuracy }
  })

  const mostPracticed = subjectUsage.reduce((best, row) => (row.attempts > best.attempts ? row : best), subjectUsage[0])
  const highestAccuracy = subjectUsage.filter((row) => row.attempts > 0).reduce((best, row) => (row.accuracy > best.accuracy ? row : best), subjectUsage.find((row) => row.attempts > 0) || subjectUsage[0])
  const lowestAccuracy = subjectUsage.filter((row) => row.attempts > 0).reduce((best, row) => (row.accuracy < best.accuracy ? row : best), subjectUsage.find((row) => row.attempts > 0) || subjectUsage[0])

  const heatCells: Array<{ day: number; hour: number; count: number }> = []
  const dayTotals = new Array(7).fill(0)
  let peakCell = { day: 0, hour: 0, count: 0 }
  let nightCount = 0
  let earlyCount = 0
  let totalCount = 0
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const count = usageHeat.get(`${day}-${hour}`) || 0
      heatCells.push({ day, hour, count })
      dayTotals[day] += count
      totalCount += count
      if (count > peakCell.count) peakCell = { day, hour, count }
      if (hour >= 22) nightCount += count
      if (hour < 7) earlyCount += count
    }
  }
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const mostActiveDay = dayNames[dayTotals.reduce((best, value, index, arr) => (value > arr[best] ? index : best), 0)]

  const signupAnalytics = analyticsRows.filter((row) => row.path?.toLowerCase().includes('signup'))
  const sourceCounts = new Map<string, number>()
  const deviceCounts = new Map<'mobile' | 'desktop' | 'tablet', number>([['mobile', 0], ['desktop', 0], ['tablet', 0]])
  const browserCounts = new Map<string, number>()
  signupAnalytics.forEach((row) => {
    const source = detectSource(row.referrer)
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1)
    const device = detectDevice(row.userAgent)
    deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1)
    const browser = detectBrowser(row.userAgent)
    browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1)
  })

  const signupSourceTotal = Math.max(signups.length, signupAnalytics.length)
  const sourceRows = SOURCE_ORDER.map((source) => ({
    source,
    count: sourceCounts.get(source) || 0,
    percent: round1(asPercent(sourceCounts.get(source) || 0, Math.max(1, signupSourceTotal))),
  }))
  const topSource = sourceRows.reduce((best, row) => (row.count > best.count ? row : best), sourceRows[0])

  const deviceTotal = Math.max(1, signupAnalytics.length)
  const mobile = round1(asPercent(deviceCounts.get('mobile') || 0, deviceTotal))
  const desktop = round1(asPercent(deviceCounts.get('desktop') || 0, deviceTotal))
  const tablet = round1(asPercent(deviceCounts.get('tablet') || 0, deviceTotal))
  const browsers = Array.from(browserCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([browser, count]) => ({ browser, percent: round1(asPercent(count, deviceTotal)) }))

  const mockRowsSeed: Array<{ testType: 'bae_mock' | 'foa_mock' | 'qafb_mock'; label: string; attempts: number; completed: number; passRate: number; avgScore: number }> = [
    { testType: 'bae_mock', label: 'BAE Mock', attempts: 0, completed: 0, passRate: 0, avgScore: 0 },
    { testType: 'foa_mock', label: 'FOA Mock', attempts: 0, completed: 0, passRate: 0, avgScore: 0 },
    { testType: 'qafb_mock', label: 'QAFB Mock', attempts: 0, completed: 0, passRate: 0, avgScore: 0 },
  ]
  const mockRowsMap = new Map(mockRowsSeed.map((row) => [row.testType, row]))
  const scoreSum: Record<'bae_mock' | 'foa_mock' | 'qafb_mock', number> = { bae_mock: 0, foa_mock: 0, qafb_mock: 0 }
  const passSum: Record<'bae_mock' | 'foa_mock' | 'qafb_mock', number> = { bae_mock: 0, foa_mock: 0, qafb_mock: 0 }
  const trendByDay = new Map(dayKeys.map((key) => [key, { bae: 0, foa: 0, qafb: 0 }]))

  mocks.forEach((row) => {
    const key = row.testType === 'foa_mock' || row.testType === 'qafb_mock' || row.testType === 'bae_mock' ? row.testType : 'bae_mock'
    const bucket = mockRowsMap.get(key)
    if (!bucket) return
    bucket.attempts += 1
    if (row.completed) {
      bucket.completed += 1
      scoreSum[key] += row.scorePercent || 0
      if ((row.scorePercent || 0) >= 60) passSum[key] += 1
    }
    const day = trendByDay.get(dayKey(row.createdAt))
    if (!day) return
    if (key === 'bae_mock') day.bae += 1
    if (key === 'foa_mock') day.foa += 1
    if (key === 'qafb_mock') day.qafb += 1
  })

  const mockRows = Array.from(mockRowsMap.values()).map((row) => {
    const key = row.testType
    return {
      ...row,
      passRate: row.completed > 0 ? round1(asPercent(passSum[key], row.completed)) : 0,
      avgScore: row.completed > 0 ? round1(scoreSum[key] / row.completed) : 0,
    }
  })
  const topMock = mockRows.reduce((best, row) => (row.attempts > best.attempts ? row : best), mockRows[0])
  const mockTrendPoints = dayKeys.map((key) => ({ dayKey: key, ...(trendByDay.get(key) || { bae: 0, foa: 0, qafb: 0 }) }))

  const activeUserIds = Array.from(activeUsers)
  const cities = activeUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: activeUserIds } },
        select: { city: true },
      })
    : []
  const cityCount = new Map<string, number>()
  cities.forEach((row) => {
    const city = String(row.city || '').trim()
    const key = city ? titleCase(city) : 'Unknown'
    cityCount.set(key, (cityCount.get(key) || 0) + 1)
  })
  const sortedCities = Array.from(cityCount.entries()).sort((a, b) => b[1] - a[1])
  const topCities = sortedCities.slice(0, 6)
  const remainder = sortedCities.slice(6).reduce((sum, row) => sum + row[1], 0)
  if (remainder > 0) topCities.push(['Others', remainder])
  const cityTotal = Math.max(1, topCities.reduce((sum, row) => sum + row[1], 0))
  const geographyRows = topCities.map(([city, count], index) => ({
    rank: index + 1,
    city,
    students: count,
    percent: round1(asPercent(count, cityTotal)),
    medal: index === 0 ? ('gold' as const) : index === 1 ? ('silver' as const) : index === 2 ? ('bronze' as const) : null,
  }))

  const settingsRecord = asRecord(settings?.testSettings)
  const manualAdsense = readAdsenseSettings(settingsRecord)
  const thisMonthStart = new Date(Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1, 0, 0, 0, 0))
  const thisMonthPageViews = await prisma.analytics.count({
    where: { createdAt: { gte: thisMonthStart, lte: range.to } },
  })
  const rpmUsd = 0.45
  const estimatedUsd = (thisMonthPageViews / 1000) * rpmUsd

  const runMeta = asRecord(settingsRecord.platformStatsLastRun)
  const fallbackRunMeta = asRecord(settingsRecord.platformStatsDailyLastRun)
  const runStatusRaw = runMeta.status || fallbackRunMeta.status
  const runAtRaw = runMeta.runAt || fallbackRunMeta.runAt
  const runErrorRaw = runMeta.error || fallbackRunMeta.error
  const runStatus = runStatusRaw === 'success' || runStatusRaw === 'failed' ? runStatusRaw : null

  return {
    generatedAt: new Date().toISOString(),
    range: {
      preset: range.preset,
      label: range.label,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      startInput: range.startInput,
      endInput: range.endInput,
    },
    kpis: {
      activeUsers: {
        label: 'Active Students',
        value: activeCount,
        valueText: formatCompact(activeCount),
        subtext: `${activeCount - previousActiveCount >= 0 ? '+' : ''}${activeCount - previousActiveCount} vs previous period`,
        ...activeTrend,
      },
      newSignups: {
        label: 'New Signups',
        value: signups.length,
        valueText: formatCompact(signups.length),
        subtext: signupTrend.trendText,
        ...signupTrend,
      },
      questionsAnswered: {
        label: 'Questions Answered',
        value: questionsAnswered,
        valueText: formatCompact(questionsAnswered),
        subtext: `Avg ${Math.round(activeCount > 0 ? questionsAnswered / activeCount : 0)} per active student`,
        ...questionsTrend,
      },
      mockTestsCompleted: {
        label: 'Mock Tests Completed',
        value: completedMocks.length,
        valueText: formatCompact(completedMocks.length),
        subtext: `Pass rate: ${mockPassRate.toFixed(1)}%`,
        ...mockTrendStats,
      },
      averageSessionLength: {
        label: 'Avg Session Length',
        value: Math.round(avgSessionMinutes),
        valueText: `${Math.round(avgSessionMinutes)} min`,
        subtext: 'Per active student',
        ...sessionTrendStats,
      },
      streakLeader: {
        label: 'Longest Active Streak',
        value: currentStreakLeader,
        valueText: `${currentStreakLeader} days`,
        subtext: 'Top student this period',
        ...streakTrend,
      },
    },
    activeUsersChart: {
      points: chartPoints,
      pills: {
        today: activityByDay.get(todayKey)?.size || 0,
        yesterday: activityByDay.get(yesterdayKey)?.size || 0,
        peak: { dayKey: peakPoint.dayKey, count: peakPoint.dau || 0 },
      },
    },
    retention: {
      cohorts: retentionCohorts,
      summary: {
        day1: retentionSummary.day1,
        day7: retentionSummary.day7,
        day30: retentionSummary.day30,
        atRiskCount,
      },
    },
    subjectPerformance: {
      usage: subjectUsage,
      insights: {
        mostPracticed: `${mostPracticed.subjectCode} (${formatCompact(mostPracticed.attempts)} questions)`,
        highestAccuracy: `${highestAccuracy.subjectCode} (${highestAccuracy.accuracy.toFixed(1)}%)`,
        needsAttention: `${lowestAccuracy.subjectCode} (${lowestAccuracy.accuracy.toFixed(1)}%)`,
      },
    },
    peakUsage: {
      cells: heatCells,
      insights: {
        peakTimeLabel: `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][peakCell.day]} ${peakCell.hour}:00`,
        peakTimeCount: peakCell.count,
        mostActiveDay,
        nightOwlPercent: round1(asPercent(nightCount, Math.max(1, totalCount))),
        earlyBirdPercent: round1(asPercent(earlyCount, Math.max(1, totalCount))),
      },
    },
    signupSources: {
      total: signupSourceTotal,
      rows: sourceRows,
      insight: sourceInsight(topSource.source),
    },
    deviceUsage: {
      mobile,
      desktop,
      tablet,
      browsers,
      insight: mobile >= desktop ? `${mobile.toFixed(1)}% of students use mobile. Prioritize mobile UX.` : `${desktop.toFixed(1)}% of students use desktop. Desktop workflows remain important.`,
    },
    mockAnalytics: {
      rows: mockRows,
      trend: mockTrendPoints,
      insights: [
        `${topMock.label} is the most popular test - ${topMock.attempts} attempts in this period.`,
        `FOA Mock pass rate is ${mockRows.find((row) => row.testType === 'foa_mock')?.passRate.toFixed(1) || '0.0'}% in this period.`,
      ],
    },
    geography: {
      rows: geographyRows,
      insight: geographyRows[0] ? `${geographyRows[0].city} accounts for ${geographyRows[0].percent.toFixed(1)}% of active students in this period.` : 'Location data not available for this period.',
    },
    adsense: {
      manual: manualAdsense,
      estimate: {
        rpmUsd,
        pageViews: thisMonthPageViews,
        estimatedUsd,
      },
    },
    platformStatsJob: {
      status: runStatus,
      runAt: typeof runAtRaw === 'string' ? runAtRaw : null,
      error: typeof runErrorRaw === 'string' ? runErrorRaw : null,
    },
  }
}

async function buildLeaderboardPayload(prisma: PrismaClient, range: DateRange): Promise<LeaderboardPayload> {
  const [current, best, streakPopulation] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.student, practiceStreakCurrent: { gt: 0 } },
      orderBy: [{ practiceStreakCurrent: 'desc' }, { updatedAt: 'desc' }],
      take: 20,
      select: { id: true, name: true, practiceStreakCurrent: true },
    }),
    prisma.user.findMany({
      where: { role: UserRole.student, practiceStreakBest: { gt: 0 } },
      orderBy: [{ practiceStreakBest: 'desc' }, { updatedAt: 'desc' }],
      take: 20,
      select: { id: true, name: true, practiceStreakBest: true },
    }),
    prisma.user.findMany({
      where: { role: UserRole.student, practiceStreakCurrent: { gt: 0 } },
      select: { practiceStreakCurrent: true },
    }),
  ])

  const userIds = Array.from(new Set([...current.map((row) => row.id), ...best.map((row) => row.id)]))
  const [results, mocks] = userIds.length
    ? await Promise.all([
        prisma.testResult.findMany({
          where: { userId: { in: userIds }, createdAt: { gte: range.from, lte: range.to } },
          select: { userId: true, subject: true, totalQuestions: true, correctAnswers: true },
        }),
        prisma.baeMockSession.findMany({
          where: { userId: { in: userIds }, createdAt: { gte: range.from, lte: range.to } },
          select: { userId: true, testType: true, totalQuestions: true, correctAnswers: true, vol1Count: true, vol2Count: true, vol1Correct: true, vol2Correct: true },
        }),
      ])
    : [[], []]

  const statMap = new Map<string, { attempted: number; correct: number; subjects: Set<string> }>()
  const ensure = (userId: string) => {
    const existing = statMap.get(userId)
    if (existing) return existing
    const created = { attempted: 0, correct: 0, subjects: new Set<string>() }
    statMap.set(userId, created)
    return created
  }

  results.forEach((row) => {
    if (!row.userId) return
    const stat = ensure(row.userId)
    stat.attempted += Math.max(0, row.totalQuestions || 0)
    stat.correct += Math.max(0, row.correctAnswers || 0)
    const subject = normalizeSubject(row.subject)
    if (subject) stat.subjects.add(subject)
  })

  mocks.forEach((row) => {
    const stat = ensure(row.userId)
    if (row.testType === 'bae_mock') {
      stat.attempted += Math.max(0, row.vol1Count || 0) + Math.max(0, row.vol2Count || 0)
      stat.correct += Math.max(0, row.vol1Correct || 0) + Math.max(0, row.vol2Correct || 0)
      stat.subjects.add('BAEIVI')
      stat.subjects.add('BAEIV2E')
    } else {
      stat.attempted += Math.max(0, row.totalQuestions || 0)
      stat.correct += Math.max(0, row.correctAnswers || 0)
      if (row.testType === 'foa_mock') stat.subjects.add('FOA')
      if (row.testType === 'qafb_mock') stat.subjects.add('QAFB')
    }
  })

  const toRows = (
    list: Array<{ id: string; name: string; practiceStreakCurrent?: number; practiceStreakBest?: number }>,
    field: 'practiceStreakCurrent' | 'practiceStreakBest'
  ) =>
    list.map((user, index) => {
      const stat = statMap.get(user.id)
      const accuracy = stat && stat.attempted > 0 ? round1(asPercent(stat.correct, stat.attempted)) : 0
      return {
        rank: index + 1,
        userId: user.id,
        displayName: shortName(user.name),
        streak: Number(user[field] || 0),
        subjects: stat ? Array.from(stat.subjects).slice(0, 2).join('+') || '--' : '--',
        accuracy,
      }
    })

  const buckets = { '1-6 days': 0, '7-13 days': 0, '14-29 days': 0, '30+ days': 0 }
  streakPopulation.forEach((row) => {
    const streak = row.practiceStreakCurrent || 0
    if (streak <= 0) return
    if (streak >= 30) buckets['30+ days'] += 1
    else if (streak >= 14) buckets['14-29 days'] += 1
    else if (streak >= 7) buckets['7-13 days'] += 1
    else buckets['1-6 days'] += 1
  })
  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0)

  return {
    current: toRows(current, 'practiceStreakCurrent'),
    best: toRows(best, 'practiceStreakBest'),
    distribution: Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
      percent: round1(asPercent(count, Math.max(1, total))),
    })),
  }
}

async function buildLiveActivityPayload(prisma: PrismaClient, range: DateRange): Promise<{ events: LiveEvent[]; refreshedAt: string }> {
  const [mockRows, practiceRows, signupRows, badgeRows, blogSpikes, atRisk] = await Promise.all([
    prisma.baeMockSession.findMany({
      where: { completed: true, createdAt: { gte: range.from, lte: range.to } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, userId: true, testType: true, scorePercent: true, createdAt: true },
    }),
    prisma.testResult.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, userId: true, subject: true, score: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: UserRole.student, createdAt: { gte: range.from, lte: range.to } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, city: true, createdAt: true },
    }),
    prisma.userBadge.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, userId: true, badgeType: true, createdAt: true },
    }),
    prisma.blogAnalyticsEvent.groupBy({
      by: ['postId'],
      where: { eventType: BlogAnalyticsEventType.page_view, createdAt: { gte: startOfDay(new Date()), lte: new Date() }, postId: { not: null } },
      _count: { postId: true },
      orderBy: { _count: { postId: 'desc' } },
      take: 5,
    }),
    prisma.user.count({
      where: { role: UserRole.student, practiceStreakCurrent: { gt: 0 }, practiceStreakLastDate: { lt: new Date(Date.now() - 7 * DAY_MS) } },
    }),
  ])

  const namesById = new Map<string, string>()
  if (mockRows.length || practiceRows.length || badgeRows.length) {
    const ids = Array.from(new Set([...mockRows.map((row) => row.userId), ...practiceRows.map((row) => row.userId).filter(Boolean) as string[], ...badgeRows.map((row) => row.userId)]))
    const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []
    users.forEach((user) => namesById.set(user.id, user.name))
  }

  const events: LiveEvent[] = []
  mockRows.forEach((row) => {
    events.push({
      id: `mock-${row.id}`,
      icon: '🟢',
      message: `${shortName(namesById.get(row.userId))} completed ${mockLabel(row.testType)} - ${row.scorePercent}%`,
      subtext: 'Mock test completed',
      timestamp: row.createdAt.toISOString(),
      timestampLabel: relativeTime(row.createdAt),
    })
  })
  practiceRows.forEach((row) => {
    if (!row.userId) return
    const subject = normalizeSubject(row.subject) || 'FOA'
    events.push({
      id: `practice-${row.id}`,
      icon: '📚',
      message: `${shortName(namesById.get(row.userId))} practiced ${subject}`,
      subtext: `Session score ${row.score}%`,
      timestamp: row.createdAt.toISOString(),
      timestampLabel: relativeTime(row.createdAt),
    })
  })
  signupRows.forEach((row) => {
    events.push({
      id: `signup-${row.id}`,
      icon: '✅',
      message: `New signup: ${shortName(row.name)}`,
      subtext: `from ${row.city ? titleCase(row.city) : 'Unknown city'}`,
      timestamp: row.createdAt.toISOString(),
      timestampLabel: relativeTime(row.createdAt),
    })
  })
  badgeRows.forEach((row) => {
    events.push({
      id: `badge-${row.id}`,
      icon: '🔥',
      message: `${shortName(namesById.get(row.userId))} reached ${row.badgeType.replace(/_/g, ' ')}`,
      subtext: 'Streak milestone',
      timestamp: row.createdAt.toISOString(),
      timestampLabel: relativeTime(row.createdAt),
    })
  })
  blogSpikes.forEach((row) => {
    events.push({
      id: `blog-${row.postId}`,
      icon: '📖',
      message: 'Blog activity spike detected',
      subtext: `${row._count.postId} views today`,
      timestamp: new Date().toISOString(),
      timestampLabel: 'just now',
    })
  })
  if (atRisk > 0) {
    events.push({
      id: 'at-risk',
      icon: '⚠️',
      message: `${atRisk} students are at risk of churn`,
      subtext: 'No activity in 7+ days',
      timestamp: new Date().toISOString(),
      timestampLabel: 'just now',
    })
  }

  return {
    events: events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50),
    refreshedAt: new Date().toISOString(),
  }
}

export async function buildAdminAnalyticsReport(prisma: PrismaClient, range: DateRange): Promise<AdminAnalyticsReportPayload> {
  const key = cacheKey(range)
  const cachedHeavy = fromCache(heavyCache, key)
  const cachedLeaderboard = fromCache(leaderboardCache, key)

  const heavy = cachedHeavy || (await buildHeavyPayload(prisma, range))
  if (!cachedHeavy) toCache(heavyCache, key, heavy, HEAVY_CACHE_TTL_MS)

  const leaderboard = cachedLeaderboard || (await buildLeaderboardPayload(prisma, range))
  if (!cachedLeaderboard) toCache(leaderboardCache, key, leaderboard, LEADERBOARD_CACHE_TTL_MS)

  const liveActivity = await buildLiveActivityPayload(prisma, range)

  return { heavy, leaderboard, liveActivity }
}

export async function updateAdminAdsenseManualRevenue(
  prisma: PrismaClient,
  values: { thisMonthPkr: number; lastMonthPkr: number }
) {
  let settings = await prisma.systemSettings.findFirst({ select: { id: true, testSettings: true } })
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: {}, select: { id: true, testSettings: true } })
  }

  const record = asRecord(settings.testSettings)
  const existing = readAdsenseSettings(record)
  const monthKey = dayInput(new Date()).slice(0, 7)
  const map = new Map(existing.history.map((row) => [row.monthKey, row.valuePkr]))
  map.set(monthKey, values.thisMonthPkr)
  const history = Array.from(map.entries())
    .map(([key, value]) => ({ monthKey: key, valuePkr: value }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-6)

  const nextManual = {
    thisMonthPkr: values.thisMonthPkr,
    lastMonthPkr: values.lastMonthPkr,
    updatedAt: new Date().toISOString(),
    history,
  }

  const nextSettings: Record<string, unknown> = {
    ...record,
    adminAnalyticsAdsense: nextManual,
  }

  await prisma.systemSettings.update({
    where: { id: settings.id },
    data: { testSettings: nextSettings as any },
  })

  return nextManual
}

export function buildAdminAnalyticsCsv(report: AdminAnalyticsReportPayload) {
  const lines: string[] = []
  lines.push('Section,Metric,Value')
  lines.push(`Range,Label,"${escapeCsv(report.heavy.range.label)}"`)
  lines.push(`Range,From,${report.heavy.range.from}`)
  lines.push(`Range,To,${report.heavy.range.to}`)

  const kpis = report.heavy.kpis
  Object.entries(kpis).forEach(([key, value]) => {
    lines.push(`KPI,${key},"${escapeCsv(value.valueText)}"`)
    lines.push(`KPI,${key} Trend,"${escapeCsv(value.trendText)}"`)
  })

  lines.push('')
  lines.push('Daily Active Users')
  lines.push('Date,DAU,WAU,MAU,New Signups')
  report.heavy.activeUsersChart.points.forEach((row) => {
    lines.push(`${row.dayKey},${row.dau},${row.wau},${row.mau},${row.newSignups}`)
  })

  lines.push('')
  lines.push('Subject Performance')
  lines.push('Subject,Attempts,Accuracy')
  report.heavy.subjectPerformance.usage.forEach((row) => {
    lines.push(`${row.subjectCode},${row.attempts},${row.accuracy}`)
  })

  lines.push('')
  lines.push('Mock Tests')
  lines.push('Test Type,Attempts,Completed,Pass Rate,Avg Score')
  report.heavy.mockAnalytics.rows.forEach((row) => {
    lines.push(`${row.label},${row.attempts},${row.completed},${row.passRate},${row.avgScore}`)
  })

  lines.push('')
  lines.push('Geography')
  lines.push('Rank,City,Students,Percent')
  report.heavy.geography.rows.forEach((row) => {
    lines.push(`${row.rank},"${escapeCsv(row.city)}",${row.students},${row.percent}`)
  })

  lines.push('')
  lines.push('Leaderboard Current')
  lines.push('Rank,Student,Streak,Subjects,Accuracy')
  report.leaderboard.current.forEach((row) => {
    lines.push(`${row.rank},"${escapeCsv(row.displayName)}",${row.streak},"${escapeCsv(row.subjects)}",${row.accuracy}`)
  })

  return lines.join('\n')
}

function escapeCsv(value: string) {
  return value.replace(/"/g, '""')
}
