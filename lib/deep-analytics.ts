import type { PrismaClient } from '@prisma/client'
import {
  buildChapterLabelMap,
  extractChapterRows,
  resolveChapterLabel,
} from '@/lib/chapter-labels'

export type AnalyticsRangeKey = '7d' | '30d' | '90d' | 'all'

export type RecommendationSubjectSnapshot = {
  code: string
  name: string
  shortName: string
  slug: string
  questionsAttempted: number
  totalQuestions: number
  accuracy: number
  lastPracticed: string | null
  daysSinceLastPractice: number | null
  recentSessions: number[]
}

export type RecommendationChapterSnapshot = {
  id: string
  name: string
  subjectCode: string
  subjectName: string
  questionsAttempted: number
  correctAnswers: number
  accuracy: number
  lastPracticed: string | null
}

export type RecommendationContext = {
  overallAccuracy: number
  totalQuestioned: number
  daysSinceLastPractice: number
  currentStreak: number
  examDate: string | null
  examReadinessScore: number
  baeMockAttempts: number
  foaMockAttempts: number
  qafbMockAttempts: number
  latestFoaWeakChapter: {
    chapterCode: string
    chapterLabel: string
    accuracy: number
  } | null
  latestQafbWeakChapter: {
    chapterCode: string
    chapterLabel: string
    accuracy: number
  } | null
  subjects: RecommendationSubjectSnapshot[]
  chapters: RecommendationChapterSnapshot[]
}

type ResultRecord = {
  id: string
  userId: string | null
  subject: string
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  notAttempted: number
  score: number
  weightedPercent: number | null
  answers: unknown
  duration: number
  createdAt: Date
}

type SubjectRecord = {
  code: string
  name: string
  chapters: unknown
  totalQuestions: number
}

type QuestionMeta = {
  id: string
  subject: string
  chapter: string | null
  questionNumber: number
}

type ParsedAnswer = {
  questionId: string
  subject: string | null
  questionNumber: number | null
  isCorrect: boolean
  selectedAnswer: number[]
  timeSpent: number | null
}

type RangeWindow = {
  key: AnalyticsRangeKey
  from: Date | null
  to: Date
  previousFrom: Date | null
  previousTo: Date | null
  label: string
  spanDays: number
}

type SubjectAggregate = {
  code: string
  name: string
  shortName: string
  slug: string
  totalQuestions: number
  attempted: number
  correct: number
  accuracy: number
  trend: 'up' | 'down' | 'flat'
  trendDelta: number
  averageTimePerQuestion: number
  platformAverageAccuracy: number | null
  platformAverageTime: number | null
  lastPracticed: string | null
  daysSinceLastPractice: number | null
  progressPercent: number
  recentSessions: number[]
}

type ChapterAggregate = {
  subjectCode: string
  chapterKey: string
  chapterLabel: string
  attempted: number
  correct: number
  accuracy: number
  lastPracticed: Date | null
}

type MockSessionRecord = {
  id: string
  testType: string
  totalQuestions: number
  correctAnswers: number
  scorePercent: number
  timeAllowed: number
  timeTaken: number | null
  chapterBreakdown: unknown
  completedAt: Date | null
  createdAt: Date
}

type ReadinessFactor = {
  key: 'accuracy' | 'volume' | 'coverage' | 'recentActivity' | 'weakAreas'
  label: string
  points: number
  maxPoints: number
}

type DeepAnalyticsInternal = {
  payload: DeepAnalyticsPayload
  recommendationContext: RecommendationContext
}

export type DeepAnalyticsPayload = {
  generatedAt: string
  range: {
    key: AnalyticsRangeKey
    label: string
    from: string | null
    to: string
  }
  topStats: {
    totalQuestionsPracticed: number
    totalQuestionsTrend: number | null
    overallAccuracy: number
    overallAccuracyTrend: number | null
    streak: {
      current: number
      best: number
      practicedToday: boolean
    }
    examReadiness: {
      score: number
      trend: number | null
    }
  }
  readiness: {
    score: number
    factors: ReadinessFactor[]
    interpretation: {
      tone: 'red' | 'amber' | 'green' | 'blue'
      title: string
      message: string
    }
  }
  accuracyTrend: {
    points: Array<{
      dateKey: string
      label: string
      userAccuracy: number | null
      platformAccuracy: number | null
    }>
    insight: {
      direction: 'up' | 'down' | 'flat'
      delta: number
      message: string
      tone: 'green' | 'amber' | 'slate'
    }
  }
  subjects: SubjectAggregate[]
  heatmap: {
    tabs: Array<{
      code: string
      name: string
      chapters: Array<{
        key: string
        label: string
        attempted: number
        correct: number
        accuracy: number | null
        status: 'not_attempted' | 'needs_work' | 'improving' | 'strong'
        lastPracticed: string | null
        practiceLink: string
      }>
    }>
  }
  timeAnalysis: {
    averageTimePerQuestion: number
    platformAverageTimePerQuestion: number | null
    deltaVsPlatform: number | null
    distribution: Array<{ bucket: string; count: number }>
    subjectBreakdown: Array<{
      code: string
      averageTimePerQuestion: number
      platformAverageTimePerQuestion: number | null
      deltaVsPlatform: number | null
    }>
    insight: string
  }
  comparison: {
    metrics: Array<{
      key: string
      label: string
      you: string
      platform: string
      trend: 'above' | 'below' | 'equal'
    }>
    percentileTop: number | null
  }
  mockHistory: {
    foa: Array<{
      id: string
      date: string
      scorePercent: number
      scoreText: string
      weakestChapter: string | null
      weakestChapterLabel: string | null
      weakestAccuracy: number | null
      timeAllowed: number
      timeTaken: number
      improvementDelta: number
    }>
    qafb: Array<{
      id: string
      date: string
      scorePercent: number
      scoreText: string
      weakestChapter: string | null
      weakestChapterLabel: string | null
      weakestAccuracy: number | null
      timeAllowed: number
      timeTaken: number
      improvementDelta: number
    }>
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

const SUBJECT_SHORT_NAMES: Record<string, string> = {
  BAEIVI: 'BEI Vol I',
  BAEIVII: 'BEI Vol I',
  BAEIV2E: 'BEI Vol II',
  FOA: 'Fund. of Accounting',
  QAFB: 'Quant. Analysis',
}

export function parseAnalyticsRangeKey(input: string | null | undefined): AnalyticsRangeKey {
  if (input === '7d' || input === '30d' || input === '90d' || input === 'all') {
    return input
  }
  return 'all'
}

function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function diffInDays(later: Date, earlier: Date): number {
  return Math.floor((startOfUtcDay(later).getTime() - startOfUtcDay(earlier).getTime()) / DAY_MS)
}

function getRangeWindow(key: AnalyticsRangeKey, now = new Date()): RangeWindow {
  if (key === 'all') {
    return {
      key,
      from: null,
      to: now,
      previousFrom: null,
      previousTo: null,
      label: 'All time',
      spanDays: 120,
    }
  }

  const span = key === '7d' ? 7 : key === '30d' ? 30 : 90
  const from = new Date(now.getTime() - span * DAY_MS)
  const previousTo = from
  const previousFrom = new Date(from.getTime() - span * DAY_MS)
  const label = key === '7d' ? 'Last 7 days' : key === '30d' ? 'Last 30 days' : 'Last 3 months'

  return {
    key,
    from,
    to: now,
    previousFrom,
    previousTo,
    label,
    spanDays: span,
  }
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function parseAnswers(raw: unknown): ParsedAnswer[] {
  if (!Array.isArray(raw)) return []

  const parsed: ParsedAnswer[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const questionId = String(record.questionId || '').trim()
    if (!questionId) continue

    const selectedRaw = Array.isArray(record.selectedAnswer)
      ? record.selectedAnswer
      : typeof record.selectedAnswer === 'number'
        ? [record.selectedAnswer]
        : []
    const selectedAnswer = selectedRaw
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0)

    const timeCandidate = Number(record.timeSpent)
    parsed.push({
      questionId,
      subject: record.subject ? String(record.subject) : null,
      questionNumber: Number.isFinite(Number(record.questionNumber)) ? Number(record.questionNumber) : null,
      isCorrect: Boolean(record.isCorrect),
      selectedAnswer,
      timeSpent: Number.isFinite(timeCandidate) && timeCandidate >= 0 ? timeCandidate : null,
    })
  }

  return parsed
}

function parseChapterBreakdown(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.entries(raw as Record<string, any>)
    .map(([chapterCode, row]) => {
      const attempted = Math.max(0, Number(row?.attempted) || 0)
      const correct = Math.max(0, Number(row?.correct) || 0)
      const accuracyValue =
        typeof row?.accuracy === 'number'
          ? Math.max(0, Number(row.accuracy) || 0)
          : attempted > 0
            ? round((correct / attempted) * 100, 1)
            : 0
      return {
        chapterCode,
        attempted,
        correct,
        accuracy: accuracyValue,
      }
    })
    .filter((row) => row.attempted > 0)
}

function extractWeakestChapterFromBreakdown(raw: unknown) {
  const entries = parseChapterBreakdown(raw)
  if (!entries.length) return null
  return entries.slice().sort((a, b) => a.accuracy - b.accuracy)[0] || null
}

function buildSingleMockHistory(rows: MockSessionRecord[], chapterLabels: Record<string, string>) {
  const sortedRows = rows
    .slice()
    .sort(
      (a, b) =>
        (a.completedAt || a.createdAt).getTime() - (b.completedAt || b.createdAt).getTime()
    )

  const history = sortedRows.map((row, index) => {
    const previous = sortedRows[index - 1]
    const weakest = extractWeakestChapterFromBreakdown(row.chapterBreakdown)
    return {
      id: row.id,
      date: (row.completedAt || row.createdAt).toISOString(),
      scorePercent: Math.max(0, Number(row.scorePercent) || 0),
      scoreText: `${Math.max(0, Number(row.correctAnswers) || 0)}/${Math.max(1, Number(row.totalQuestions) || 1)}`,
      weakestChapter: weakest?.chapterCode || null,
      weakestChapterLabel: weakest
        ? resolveChapterLabel(weakest.chapterCode, chapterLabels)
        : null,
      weakestAccuracy: weakest ? Math.round(weakest.accuracy) : null,
      timeAllowed: Math.max(0, Number(row.timeAllowed) || 0),
      timeTaken: Math.max(0, Number(row.timeTaken) || 0),
      improvementDelta: previous ? (Number(row.scorePercent) || 0) - (Number(previous.scorePercent) || 0) : 0,
    }
  })

  return history.slice(-10).reverse()
}

function isAttempted(selected: number[]): boolean {
  return selected.length > 0
}

function resolveSubjectName(subjectCode: string, subjectName: string): string {
  return SUBJECT_SHORT_NAMES[subjectCode] || subjectName || subjectCode
}

function buildReadinessInterpretation(score: number) {
  if (score <= 40) {
    return {
      tone: 'red' as const,
      title: 'Just Getting Started',
      message: 'Keep practicing daily to build your exam readiness.',
    }
  }
  if (score <= 60) {
    return {
      tone: 'amber' as const,
      title: 'Making Progress',
      message: 'You are on the right track. Focus on weak chapters to accelerate growth.',
    }
  }
  if (score <= 80) {
    return {
      tone: 'green' as const,
      title: 'Getting There',
      message: 'Good preparation. Address remaining weak areas to push your score higher.',
    }
  }
  return {
    tone: 'blue' as const,
    title: 'Exam Ready',
    message: 'Excellent preparation. You are well positioned for the exam.',
  }
}

function calculateExamReadiness(input: {
  overallAccuracy: number
  totalQuestions: number
  subjectsPracticed: number
  totalSubjects: number
  daysSinceLastPractice: number
  chapters: RecommendationChapterSnapshot[]
}) {
  const factors: ReadinessFactor[] = []
  let score = 0

  const accuracyPoints = (Math.min(input.overallAccuracy, 100) / 100) * 30
  factors.push({ key: 'accuracy', label: 'Overall Accuracy', points: round(accuracyPoints, 1), maxPoints: 30 })
  score += accuracyPoints

  const targetQuestions = 500
  const volumePoints = Math.min(input.totalQuestions / targetQuestions, 1) * 20
  factors.push({ key: 'volume', label: 'Questions Volume', points: round(volumePoints, 1), maxPoints: 20 })
  score += volumePoints

  const subjectCoveragePoints =
    (Math.min(input.subjectsPracticed, input.totalSubjects) / Math.max(1, input.totalSubjects)) * 20
  factors.push({ key: 'coverage', label: 'Subject Coverage', points: round(subjectCoveragePoints, 1), maxPoints: 20 })
  score += subjectCoveragePoints

  let recentActivityPoints = 0
  if (input.daysSinceLastPractice === 0) recentActivityPoints = 15
  else if (input.daysSinceLastPractice <= 2) recentActivityPoints = 12
  else if (input.daysSinceLastPractice <= 7) recentActivityPoints = 8
  else if (input.daysSinceLastPractice <= 14) recentActivityPoints = 3
  factors.push({
    key: 'recentActivity',
    label: 'Recent Activity',
    points: round(recentActivityPoints, 1),
    maxPoints: 15,
  })
  score += recentActivityPoints

  const chaptersWithSignals = input.chapters.filter((chapter) => chapter.questionsAttempted > 5)
  const weakChapters = chaptersWithSignals.filter((chapter) => chapter.accuracy < 50)
  const weakAreaPoints =
    chaptersWithSignals.length === 0
      ? 7
      : ((chaptersWithSignals.length - weakChapters.length) / chaptersWithSignals.length) * 15
  factors.push({ key: 'weakAreas', label: 'Weak Areas', points: round(weakAreaPoints, 1), maxPoints: 15 })
  score += weakAreaPoints

  const finalScore = Math.max(0, Math.min(100, Math.round(score)))
  return {
    score: finalScore,
    factors,
    interpretation: buildReadinessInterpretation(finalScore),
  }
}

function formatTrendInsight(delta: number, currentValue: number) {
  if (delta >= 5) {
    return {
      direction: 'up' as const,
      delta: round(delta, 1),
      message: `Your accuracy improved by ${round(delta, 1)}% in this period.`,
      tone: 'green' as const,
    }
  }
  if (delta <= -5) {
    return {
      direction: 'down' as const,
      delta: round(delta, 1),
      message: `Your accuracy declined by ${Math.abs(round(delta, 1))}% recently. Review weak chapters below.`,
      tone: 'amber' as const,
    }
  }
  return {
    direction: 'flat' as const,
    delta: round(delta, 1),
    message: `Your accuracy is stable at ${Math.round(currentValue)}%. Try harder chapters to push it higher.`,
    tone: 'slate' as const,
  }
}

function getChapterEntriesFromSubject(subject: SubjectRecord): Array<{ key: string; label: string }> {
  return extractChapterRows(subject.chapters).map((entry) => ({
    key: entry.code,
    label: entry.label,
  }))
}

function getPktDayWindow(reference = new Date(), mode: 'current' | 'previous' = 'previous') {
  const shifted = new Date(reference.getTime() + PKT_OFFSET_MS)
  if (mode === 'previous') {
    shifted.setUTCDate(shifted.getUTCDate() - 1)
  }
  const dayStartShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 0, 0, 0, 0)
  const startUtc = new Date(dayStartShifted - PKT_OFFSET_MS)
  const endUtc = new Date(startUtc.getTime() + DAY_MS)
  return {
    dayKey: toUtcDayKey(new Date(dayStartShifted)),
    startUtc,
    endUtc,
  }
}

function deriveTimeBuckets(values: number[]) {
  const buckets = [
    { label: '<15s', min: 0, max: 15, count: 0 },
    { label: '15-30s', min: 15, max: 30, count: 0 },
    { label: '30-60s', min: 30, max: 60, count: 0 },
    { label: '60-90s', min: 60, max: 90, count: 0 },
    { label: '90-120s', min: 90, max: 120, count: 0 },
    { label: '120s+', min: 120, max: Number.POSITIVE_INFINITY, count: 0 },
  ]

  for (const value of values) {
    const bucket = buckets.find((entry) => value >= entry.min && value < entry.max)
    if (bucket) bucket.count += 1
  }

  return buckets.map((entry) => ({ bucket: entry.label, count: entry.count }))
}

function buildTimeInsight(avgSeconds: number) {
  if (avgSeconds < 20) {
    return 'You are answering very quickly. Make sure you are reading each question thoroughly.'
  }
  if (avgSeconds > 90) {
    return 'You are spending significant time per question. Try timed sessions to improve pacing.'
  }
  return 'Good pace. You are balancing speed and accuracy well.'
}

type PlatformComputation = {
  userCount: number
  totalTests: number
  totalQuestions: number
  overallAccuracy: number
  avgQuestionsPerDay: number
  avgStreak: number
  avgTimePerQuestion: number
  subjectAverages: Record<
    string,
    {
      accuracy: number
      avgTimePerQuestion: number
      totalQuestions: number
    }
  >
}

export async function computePlatformStatsForWindow(
  prisma: PrismaClient,
  startUtc: Date,
  endUtc: Date
): Promise<PlatformComputation> {
  const results = await prisma.testResult.findMany({
    where: {
      createdAt: { gte: startUtc, lt: endUtc },
      userId: { not: null },
    },
    select: {
      userId: true,
      subject: true,
      totalQuestions: true,
      correctAnswers: true,
      duration: true,
    },
  })

  if (!results.length) {
    return {
      userCount: 0,
      totalTests: 0,
      totalQuestions: 0,
      overallAccuracy: 0,
      avgQuestionsPerDay: 0,
      avgStreak: 0,
      avgTimePerQuestion: 0,
      subjectAverages: {},
    }
  }

  const totalTests = results.length
  const totalQuestions = results.reduce((sum, row) => sum + Math.max(0, row.totalQuestions || 0), 0)
  const totalCorrect = results.reduce((sum, row) => sum + Math.max(0, row.correctAnswers || 0), 0)
  const totalDuration = results.reduce((sum, row) => sum + Math.max(0, row.duration || 0), 0)
  const overallAccuracy = totalQuestions > 0 ? round((totalCorrect / totalQuestions) * 100, 1) : 0
  const avgTimePerQuestion = totalQuestions > 0 ? round(totalDuration / totalQuestions, 1) : 0

  const userQuestionTotals = new Map<string, number>()
  const subjectTotals = new Map<
    string,
    { totalQuestions: number; totalCorrect: number; totalDuration: number }
  >()

  for (const row of results) {
    const userId = String(row.userId || '').trim()
    if (userId) {
      userQuestionTotals.set(userId, (userQuestionTotals.get(userId) || 0) + Math.max(0, row.totalQuestions || 0))
    }

    const subject = String(row.subject || '').trim() || 'Unknown'
    const entry = subjectTotals.get(subject) || { totalQuestions: 0, totalCorrect: 0, totalDuration: 0 }
    entry.totalQuestions += Math.max(0, row.totalQuestions || 0)
    entry.totalCorrect += Math.max(0, row.correctAnswers || 0)
    entry.totalDuration += Math.max(0, row.duration || 0)
    subjectTotals.set(subject, entry)
  }

  const daysSpan = Math.max(1, Math.round((endUtc.getTime() - startUtc.getTime()) / DAY_MS))
  const avgQuestionsPerDay =
    userQuestionTotals.size > 0
      ? round(
          Array.from(userQuestionTotals.values()).reduce((sum, value) => sum + value / daysSpan, 0) /
            userQuestionTotals.size,
          2
        )
      : 0

  const userIds = Array.from(userQuestionTotals.keys())
  const streakRows =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { practiceStreakCurrent: true },
        })
      : []
  const avgStreak =
    streakRows.length > 0
      ? round(
          streakRows.reduce((sum, row) => sum + Math.max(0, Number(row.practiceStreakCurrent) || 0), 0) / streakRows.length,
          2
        )
      : 0

  const subjectAverages: PlatformComputation['subjectAverages'] = {}
  for (const [subjectCode, totals] of subjectTotals.entries()) {
    subjectAverages[subjectCode] = {
      accuracy: totals.totalQuestions > 0 ? round((totals.totalCorrect / totals.totalQuestions) * 100, 1) : 0,
      avgTimePerQuestion: totals.totalQuestions > 0 ? round(totals.totalDuration / totals.totalQuestions, 1) : 0,
      totalQuestions: totals.totalQuestions,
    }
  }

  return {
    userCount: userQuestionTotals.size,
    totalTests,
    totalQuestions,
    overallAccuracy,
    avgQuestionsPerDay,
    avgStreak,
    avgTimePerQuestion,
    subjectAverages,
  }
}

export async function upsertPlatformDailyStats(
  prisma: PrismaClient,
  referenceDate = new Date(),
  mode: 'current' | 'previous' = 'previous'
) {
  const window = getPktDayWindow(referenceDate, mode)
  const computed = await computePlatformStatsForWindow(prisma, window.startUtc, window.endUtc)

  const row = await prisma.platformDailyStat.upsert({
    where: { dayKey: window.dayKey },
    create: {
      dayKey: window.dayKey,
      timezone: 'PKT',
      periodStart: window.startUtc,
      periodEnd: window.endUtc,
      userCount: computed.userCount,
      totalTests: computed.totalTests,
      totalQuestions: computed.totalQuestions,
      overallAccuracy: computed.overallAccuracy,
      avgQuestionsPerDay: computed.avgQuestionsPerDay,
      avgStreak: computed.avgStreak,
      avgTimePerQuestion: computed.avgTimePerQuestion,
      subjectAverages: computed.subjectAverages,
    },
    update: {
      timezone: 'PKT',
      periodStart: window.startUtc,
      periodEnd: window.endUtc,
      userCount: computed.userCount,
      totalTests: computed.totalTests,
      totalQuestions: computed.totalQuestions,
      overallAccuracy: computed.overallAccuracy,
      avgQuestionsPerDay: computed.avgQuestionsPerDay,
      avgStreak: computed.avgStreak,
      avgTimePerQuestion: computed.avgTimePerQuestion,
      subjectAverages: computed.subjectAverages,
    },
  })

  return {
    row,
    computed,
  }
}

function buildComparisonTrend(you: number, platform: number): 'above' | 'below' | 'equal' {
  if (Math.abs(you - platform) < 0.1) return 'equal'
  return you > platform ? 'above' : 'below'
}

export async function buildDeepPerformanceAnalytics(
  prisma: PrismaClient,
  userId: string,
  rangeKeyInput: string | null | undefined
): Promise<DeepAnalyticsInternal> {
  const rangeKey = parseAnalyticsRangeKey(rangeKeyInput)
  const now = new Date()
  const window = getRangeWindow(rangeKey, now)

  const resultWhere = window.from
    ? { userId, createdAt: { gte: window.from, lte: window.to } }
    : { userId }
  const previousWhere =
    window.previousFrom && window.previousTo
      ? { userId, createdAt: { gte: window.previousFrom, lt: window.previousTo } }
      : null

  const [user, subjects, questionCounts, currentResults, previousResults, allResults, mockSessions, platformRows] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          examDate: true,
          practiceStreakCurrent: true,
          practiceStreakBest: true,
          practiceStreakLastDate: true,
        },
      }),
      prisma.subject.findMany({
        select: { code: true, name: true, chapters: true, totalQuestions: true },
        orderBy: { name: 'asc' },
      }),
      prisma.question.groupBy({
        by: ['subject'],
        _count: { _all: true },
      }),
      prisma.testResult.findMany({
        where: resultWhere,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          userId: true,
          subject: true,
          totalQuestions: true,
          correctAnswers: true,
          wrongAnswers: true,
          notAttempted: true,
          score: true,
          weightedPercent: true,
          answers: true,
          duration: true,
          createdAt: true,
        },
      }),
      previousWhere
        ? prisma.testResult.findMany({
            where: previousWhere,
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              userId: true,
              subject: true,
              totalQuestions: true,
              correctAnswers: true,
              wrongAnswers: true,
              notAttempted: true,
              score: true,
              weightedPercent: true,
              answers: true,
              duration: true,
              createdAt: true,
            },
          })
        : Promise.resolve([] as ResultRecord[]),
      prisma.testResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          userId: true,
          subject: true,
          totalQuestions: true,
          correctAnswers: true,
          wrongAnswers: true,
          notAttempted: true,
          score: true,
          weightedPercent: true,
          answers: true,
          duration: true,
          createdAt: true,
        },
      }),
      prisma.baeMockSession.findMany({
        where: {
          userId,
          testType: { in: ['bae_mock', 'foa_mock', 'qafb_mock'] },
          completed: true,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          testType: true,
          totalQuestions: true,
          correctAnswers: true,
          scorePercent: true,
          timeAllowed: true,
          timeTaken: true,
          chapterBreakdown: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.platformDailyStat.findMany({
        where: window.from
          ? {
              periodStart: { gte: new Date(window.from.getTime() - DAY_MS) },
              periodEnd: { lte: window.to },
            }
          : undefined,
        orderBy: { periodStart: 'asc' },
        take: rangeKey === 'all' ? 365 : undefined,
      }),
    ])

  if (!user) {
    throw new Error('User not found')
  }

  const subjectQuestionCountMap = new Map<string, number>()
  for (const row of questionCounts) {
    subjectQuestionCountMap.set(row.subject, row._count._all || 0)
  }

  const normalizedSubjects: SubjectRecord[] = subjects.map((subject) => ({
    code: subject.code,
    name: subject.name,
    chapters: subject.chapters,
    totalQuestions: subjectQuestionCountMap.get(subject.code) || Number(subject.totalQuestions) || 0,
  }))

  const uniqueQuestionIds = new Set<string>()
  for (const result of allResults) {
    for (const answer of parseAnswers(result.answers)) {
      if (answer.questionId) uniqueQuestionIds.add(answer.questionId)
    }
  }

  const questionMetaRows = uniqueQuestionIds.size
    ? await prisma.question.findMany({
        where: { id: { in: Array.from(uniqueQuestionIds) } },
        select: { id: true, subject: true, chapter: true, questionNumber: true },
      })
    : []

  const questionMetaMap = new Map<string, QuestionMeta>()
  for (const row of questionMetaRows) {
    questionMetaMap.set(row.id, row)
  }

  const chapterCatalogRows = await prisma.question.groupBy({
    by: ['subject', 'chapter'],
    where: { chapter: { not: null } },
  })

  const chapterCatalogBySubject = new Map<string, Array<{ key: string; label: string }>>()
  for (const row of chapterCatalogRows) {
    if (!row.chapter) continue
    const subjectCode = String(row.subject || '').trim()
    if (!subjectCode) continue
    const list = chapterCatalogBySubject.get(subjectCode) || []
    if (!list.some((item) => item.key === row.chapter)) {
      list.push({ key: row.chapter, label: row.chapter })
    }
    chapterCatalogBySubject.set(subjectCode, list)
  }

  const allSubjectCodes = new Set<string>(normalizedSubjects.map((subject) => subject.code))
  for (const row of allResults) {
    if (row.subject) allSubjectCodes.add(row.subject)
  }

  const currentTotals = currentResults.reduce(
    (acc, row) => {
      acc.questions += Math.max(0, row.totalQuestions || 0)
      acc.correct += Math.max(0, row.correctAnswers || 0)
      acc.duration += Math.max(0, row.duration || 0)
      return acc
    },
    { questions: 0, correct: 0, duration: 0 }
  )

  const previousTotals = previousResults.reduce(
    (acc, row) => {
      acc.questions += Math.max(0, row.totalQuestions || 0)
      acc.correct += Math.max(0, row.correctAnswers || 0)
      return acc
    },
    { questions: 0, correct: 0 }
  )

  const allTotals = allResults.reduce(
    (acc, row) => {
      acc.questions += Math.max(0, row.totalQuestions || 0)
      acc.correct += Math.max(0, row.correctAnswers || 0)
      return acc
    },
    { questions: 0, correct: 0 }
  )

  const overallAccuracy = currentTotals.questions > 0 ? (currentTotals.correct / currentTotals.questions) * 100 : 0
  const previousAccuracy =
    previousTotals.questions > 0 ? (previousTotals.correct / previousTotals.questions) * 100 : 0
  const allTimeAccuracy = allTotals.questions > 0 ? (allTotals.correct / allTotals.questions) * 100 : 0

  const questionDelta = previousWhere ? currentTotals.questions - previousTotals.questions : null
  const accuracyDelta = previousWhere ? round(overallAccuracy - previousAccuracy, 1) : null

  const lastPracticeDate =
    user.practiceStreakLastDate ||
    (allResults.length > 0 ? allResults[allResults.length - 1].createdAt : null)
  const daysSinceLastPractice = lastPracticeDate ? diffInDays(now, lastPracticeDate) : 999
  const practicedToday = daysSinceLastPractice === 0

  const latestPlatformRow = platformRows.length ? platformRows[platformRows.length - 1] : null
  let livePlatformMetrics: PlatformComputation | null = null

  if (!latestPlatformRow) {
    const fallbackStart = window.from || new Date(now.getTime() - 30 * DAY_MS)
    livePlatformMetrics = await computePlatformStatsForWindow(prisma, fallbackStart, now)
  }

  const subjectAggregates: SubjectAggregate[] = []

  for (const subjectCode of Array.from(allSubjectCodes)) {
    const subjectInfo = normalizedSubjects.find((subject) => subject.code === subjectCode)
    const subjectName = subjectInfo?.name || subjectCode
    const subjectTotalQuestions = subjectInfo?.totalQuestions || subjectQuestionCountMap.get(subjectCode) || 0
    const subjectCurrentResults = currentResults.filter((row) => row.subject === subjectCode)
    const subjectAllResults = allResults.filter((row) => row.subject === subjectCode)

    const attempted = subjectCurrentResults.reduce((sum, row) => sum + Math.max(0, row.totalQuestions || 0), 0)
    const correct = subjectCurrentResults.reduce((sum, row) => sum + Math.max(0, row.correctAnswers || 0), 0)
    const duration = subjectCurrentResults.reduce((sum, row) => sum + Math.max(0, row.duration || 0), 0)
    const accuracy = attempted > 0 ? round((correct / attempted) * 100, 1) : 0
    const averageTimePerQuestion = attempted > 0 ? round(duration / attempted, 1) : 0

    const sessionAccuracies = subjectCurrentResults.map((row) => {
      const total = Math.max(1, row.totalQuestions || 0)
      return row.weightedPercent ?? round((Math.max(0, row.correctAnswers || 0) / total) * 100, 1)
    })
    const first = sessionAccuracies[0] ?? 0
    const last = sessionAccuracies[sessionAccuracies.length - 1] ?? 0
    const trendDelta = round(last - first, 1)
    const trend: SubjectAggregate['trend'] = trendDelta > 2 ? 'up' : trendDelta < -2 ? 'down' : 'flat'

    const lastPracticedDate = subjectAllResults.length
      ? subjectAllResults[subjectAllResults.length - 1].createdAt
      : null
    const subjectDaysSince = lastPracticedDate ? diffInDays(now, lastPracticedDate) : null

    const platformSubjectFromCache = latestPlatformRow?.subjectAverages
      ? (latestPlatformRow.subjectAverages as Record<string, { accuracy?: number; avgTimePerQuestion?: number }>)
      : null
    const platformSubjectFromLive = livePlatformMetrics?.subjectAverages || null
    const platformAverageAccuracy =
      platformSubjectFromCache?.[subjectCode]?.accuracy ??
      platformSubjectFromLive?.[subjectCode]?.accuracy ??
      null
    const platformAverageTime =
      platformSubjectFromCache?.[subjectCode]?.avgTimePerQuestion ??
      platformSubjectFromLive?.[subjectCode]?.avgTimePerQuestion ??
      null

    subjectAggregates.push({
      code: subjectCode,
      name: subjectName,
      shortName: resolveSubjectName(subjectCode, subjectName),
      slug: encodeURIComponent(subjectCode),
      totalQuestions: subjectTotalQuestions,
      attempted,
      correct,
      accuracy: round(accuracy, 1),
      trend,
      trendDelta,
      averageTimePerQuestion,
      platformAverageAccuracy: platformAverageAccuracy === null ? null : round(platformAverageAccuracy, 1),
      platformAverageTime: platformAverageTime === null ? null : round(platformAverageTime, 1),
      lastPracticed: lastPracticedDate ? lastPracticedDate.toISOString() : null,
      daysSinceLastPractice: subjectDaysSince,
      progressPercent:
        subjectTotalQuestions > 0 ? Math.min(100, Math.round((attempted / subjectTotalQuestions) * 100)) : 0,
      recentSessions: subjectAllResults
        .slice(-5)
        .map((row) =>
          row.totalQuestions > 0
            ? Math.round((Math.max(0, row.correctAnswers || 0) / Math.max(1, row.totalQuestions || 1)) * 100)
            : 0
        ),
    })
  }

  const chapterStatsCurrent = new Map<string, ChapterAggregate>()
  const chapterStatsAll = new Map<string, ChapterAggregate>()
  const allQuestionTimes: number[] = []
  const subjectTimeBuckets = new Map<string, number[]>()

  const applyChapterAggregation = (
    target: Map<string, ChapterAggregate>,
    result: ResultRecord,
    answers: ParsedAnswer[]
  ) => {
    const sessionAvgTime =
      result.totalQuestions > 0 ? Math.max(0, Math.round((result.duration || 0) / result.totalQuestions)) : 0
    for (const answer of answers) {
      const question = questionMetaMap.get(answer.questionId)
      const subjectCode = String(question?.subject || answer.subject || result.subject || '').trim()
      const chapterKey = String(question?.chapter || '').trim()
      if (!subjectCode || !chapterKey) continue

      const key = `${subjectCode}::${chapterKey}`
      const aggregate = target.get(key) || {
        subjectCode,
        chapterKey,
        chapterLabel: chapterKey,
        attempted: 0,
        correct: 0,
        accuracy: 0,
        lastPracticed: null,
      }

      if (!isAttempted(answer.selectedAnswer)) continue
      aggregate.attempted += 1
      if (answer.isCorrect) aggregate.correct += 1
      aggregate.lastPracticed = !aggregate.lastPracticed || result.createdAt > aggregate.lastPracticed ? result.createdAt : aggregate.lastPracticed
      target.set(key, aggregate)

      const timeSpent = answer.timeSpent ?? sessionAvgTime
      if (Number.isFinite(timeSpent) && timeSpent >= 0) {
        allQuestionTimes.push(timeSpent)
        const bucketList = subjectTimeBuckets.get(subjectCode) || []
        bucketList.push(timeSpent)
        subjectTimeBuckets.set(subjectCode, bucketList)
      }
    }
  }

  for (const result of currentResults) {
    const parsed = parseAnswers(result.answers)
    applyChapterAggregation(chapterStatsCurrent, result, parsed)
  }
  for (const result of allResults) {
    const parsed = parseAnswers(result.answers)
    applyChapterAggregation(chapterStatsAll, result, parsed)
  }

  for (const aggregate of chapterStatsCurrent.values()) {
    aggregate.accuracy = aggregate.attempted > 0 ? round((aggregate.correct / aggregate.attempted) * 100, 1) : 0
  }
  for (const aggregate of chapterStatsAll.values()) {
    aggregate.accuracy = aggregate.attempted > 0 ? round((aggregate.correct / aggregate.attempted) * 100, 1) : 0
  }

  const recommendationChapters: RecommendationChapterSnapshot[] = Array.from(chapterStatsAll.values()).map((chapter) => ({
    id: `${chapter.subjectCode}:${chapter.chapterKey}`,
    name: chapter.chapterLabel,
    subjectCode: chapter.subjectCode,
    subjectName:
      subjectAggregates.find((subject) => subject.code === chapter.subjectCode)?.name || chapter.subjectCode,
    questionsAttempted: chapter.attempted,
    correctAnswers: chapter.correct,
    accuracy: chapter.accuracy,
    lastPracticed: chapter.lastPracticed ? chapter.lastPracticed.toISOString() : null,
  }))

  const readiness = calculateExamReadiness({
    overallAccuracy: allTimeAccuracy,
    totalQuestions: allTotals.questions,
    subjectsPracticed: subjectAggregates.filter((subject) => subject.attempted > 0).length,
    totalSubjects: Math.max(4, subjectAggregates.length),
    daysSinceLastPractice,
    chapters: recommendationChapters,
  })

  let previousReadinessScore: number | null = null
  if (previousWhere) {
    const prevSubjectsPracticed = subjectAggregates.filter((subject) => subject.attempted > 0).length
    const previousReadiness = calculateExamReadiness({
      overallAccuracy: previousAccuracy,
      totalQuestions: previousTotals.questions,
      subjectsPracticed: prevSubjectsPracticed,
      totalSubjects: Math.max(4, subjectAggregates.length),
      daysSinceLastPractice,
      chapters: recommendationChapters,
    })
    previousReadinessScore = previousReadiness.score
  }

  const userTrendByDay = new Map<string, { total: number; correct: number }>()
  for (const row of currentResults) {
    const key = toUtcDayKey(row.createdAt)
    const bucket = userTrendByDay.get(key) || { total: 0, correct: 0 }
    bucket.total += Math.max(0, row.totalQuestions || 0)
    bucket.correct += Math.max(0, row.correctAnswers || 0)
    userTrendByDay.set(key, bucket)
  }

  const platformByDay = new Map<string, number>()
  for (const row of platformRows) {
    platformByDay.set(row.dayKey, Number(row.overallAccuracy) || 0)
  }

  if (!platformByDay.size && window.from && rangeKey !== 'all') {
    const fallbackPlatformRows = await prisma.testResult.findMany({
      where: { createdAt: { gte: window.from, lte: window.to }, userId: { not: null } },
      select: { createdAt: true, totalQuestions: true, correctAnswers: true },
    })
    const liveByDay = new Map<string, { total: number; correct: number }>()
    for (const row of fallbackPlatformRows) {
      const key = toUtcDayKey(row.createdAt)
      const bucket = liveByDay.get(key) || { total: 0, correct: 0 }
      bucket.total += Math.max(0, row.totalQuestions || 0)
      bucket.correct += Math.max(0, row.correctAnswers || 0)
      liveByDay.set(key, bucket)
    }
    for (const [key, totals] of liveByDay.entries()) {
      platformByDay.set(key, totals.total > 0 ? round((totals.correct / totals.total) * 100, 1) : 0)
    }
  }

  const trendDaysSet = new Set<string>([
    ...Array.from(userTrendByDay.keys()),
    ...Array.from(platformByDay.keys()),
  ])
  const trendDayKeys = Array.from(trendDaysSet).sort()
  const maxTrendPoints = rangeKey === 'all' ? 120 : 180
  const selectedTrendKeys = trendDayKeys.slice(-maxTrendPoints)

  const trendPoints = selectedTrendKeys.map((dayKey) => {
    const userBucket = userTrendByDay.get(dayKey)
    const userAccuracy = userBucket && userBucket.total > 0 ? round((userBucket.correct / userBucket.total) * 100, 1) : null
    const platformAccuracy = platformByDay.has(dayKey) ? round(platformByDay.get(dayKey) || 0, 1) : null
    const asDate = new Date(`${dayKey}T00:00:00.000Z`)
    const label = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(asDate)

    return { dateKey: dayKey, label, userAccuracy, platformAccuracy }
  })

  const firstPoint = trendPoints.find((point) => point.userAccuracy !== null)
  const lastPoint = [...trendPoints].reverse().find((point) => point.userAccuracy !== null)
  const trendDelta = firstPoint && lastPoint ? Number(lastPoint.userAccuracy) - Number(firstPoint.userAccuracy) : 0
  const trendInsight = formatTrendInsight(trendDelta, overallAccuracy)

  const heatmapTabs = subjectAggregates.map((subject) => {
    const fromSubjectConfig = getChapterEntriesFromSubject(
      normalizedSubjects.find((entry) => entry.code === subject.code) || {
        code: subject.code,
        name: subject.name,
        chapters: [],
        totalQuestions: subject.totalQuestions,
      }
    )
    const fromQuestions = chapterCatalogBySubject.get(subject.code) || []
    const dedup = new Map<string, { key: string; label: string }>()
    for (const chapter of [...fromSubjectConfig, ...fromQuestions]) {
      if (!chapter.key) continue
      if (!dedup.has(chapter.key)) dedup.set(chapter.key, chapter)
    }

    const sortedChapters = Array.from(dedup.values())
    return {
      code: subject.code,
      name: subject.name,
      chapters: sortedChapters.map((chapter) => {
        const key = `${subject.code}::${chapter.key}`
        const aggregate = chapterStatsCurrent.get(key)
        const accuracyValue = aggregate ? aggregate.accuracy : null
        const status: 'not_attempted' | 'needs_work' | 'improving' | 'strong' =
          accuracyValue === null
            ? 'not_attempted'
            : accuracyValue < 50
              ? 'needs_work'
              : accuracyValue <= 75
                ? 'improving'
                : 'strong'

        return {
          key: chapter.key,
          label: chapter.label,
          attempted: aggregate?.attempted || 0,
          correct: aggregate?.correct || 0,
          accuracy: accuracyValue,
          status,
          lastPracticed: aggregate?.lastPracticed ? aggregate.lastPracticed.toISOString() : null,
          practiceLink: `/subjects/${encodeURIComponent(subject.code)}/practice?chapter=${encodeURIComponent(chapter.key)}`,
        }
      }),
    }
  })

  const averageTimePerQuestion = currentTotals.questions > 0 ? round(currentTotals.duration / currentTotals.questions, 1) : 0
  const platformAverageTimePerQuestion =
    latestPlatformRow?.avgTimePerQuestion ?? livePlatformMetrics?.avgTimePerQuestion ?? null
  const deltaVsPlatform =
    platformAverageTimePerQuestion === null
      ? null
      : round(averageTimePerQuestion - Number(platformAverageTimePerQuestion), 1)

  const timeDistribution = deriveTimeBuckets(allQuestionTimes)

  const subjectTimeBreakdown = subjectAggregates.map((subject) => {
    const platformSubjectAvg =
      latestPlatformRow?.subjectAverages &&
      typeof latestPlatformRow.subjectAverages === 'object' &&
      !Array.isArray(latestPlatformRow.subjectAverages)
        ? (latestPlatformRow.subjectAverages as Record<string, { avgTimePerQuestion?: number }>)[subject.code]
            ?.avgTimePerQuestion ?? null
        : livePlatformMetrics?.subjectAverages?.[subject.code]?.avgTimePerQuestion ?? null

    return {
      code: subject.code,
      averageTimePerQuestion: subject.averageTimePerQuestion,
      platformAverageTimePerQuestion: platformSubjectAvg === null ? null : round(platformSubjectAvg, 1),
      deltaVsPlatform:
        platformSubjectAvg === null
          ? null
          : round(subject.averageTimePerQuestion - Number(platformSubjectAvg), 1),
    }
  })

  const platformOverallAccuracy = latestPlatformRow?.overallAccuracy ?? livePlatformMetrics?.overallAccuracy ?? 0
  const platformQuestionsPerDay = latestPlatformRow?.avgQuestionsPerDay ?? livePlatformMetrics?.avgQuestionsPerDay ?? 0
  const platformStreak = latestPlatformRow?.avgStreak ?? livePlatformMetrics?.avgStreak ?? 0

  const userQuestionsPerDay =
    window.spanDays > 0 ? round(currentTotals.questions / Math.max(1, window.key === 'all' ? 30 : window.spanDays), 1) : 0
  const foaAccuracy = subjectAggregates.find((subject) => subject.code === 'FOA')?.accuracy ?? 0
  const platformFoaAccuracy =
    ((latestPlatformRow?.subjectAverages as Record<string, { accuracy?: number }> | null)?.FOA?.accuracy as number | undefined) ??
    livePlatformMetrics?.subjectAverages?.FOA?.accuracy ??
    0

  const isBaeVol1 = (code: string) => code === 'BAEIVII' || code === 'BAEIVI'
  const baeSubjects = subjectAggregates.filter(
    (subject) => isBaeVol1(subject.code) || subject.code === 'BAEIV2E'
  )
  const baeAccuracy =
    baeSubjects.length > 0
      ? round(baeSubjects.reduce((sum, subject) => sum + subject.accuracy, 0) / baeSubjects.length, 1)
      : 0
  const platformSubjectAverages =
    (latestPlatformRow?.subjectAverages as Record<string, { accuracy?: number }> | null) || null
  const resolvePlatformSubjectAccuracy = (codes: string[]) => {
    for (const code of codes) {
      const cache = platformSubjectAverages?.[code]?.accuracy
      if (typeof cache === 'number') return cache
      const live = livePlatformMetrics?.subjectAverages?.[code]?.accuracy
      if (typeof live === 'number') return live
    }
    return null
  }
  const platformBaeAverages = [
    resolvePlatformSubjectAccuracy(['BAEIVII', 'BAEIVI']),
    resolvePlatformSubjectAccuracy(['BAEIV2E']),
  ].filter((value): value is number => value !== null)
  const platformBaeAccuracy =
    platformBaeAverages.length > 0
      ? round(platformBaeAverages.reduce((sum, value) => sum + value, 0) / platformBaeAverages.length, 1)
      : 0

  const completedMockSessions = mockSessions as MockSessionRecord[]
  const baeAttempts = completedMockSessions.filter((row) => row.testType === 'bae_mock').length
  const foaSessions = completedMockSessions.filter((row) => row.testType === 'foa_mock')
  const qafbSessions = completedMockSessions.filter((row) => row.testType === 'qafb_mock')
  const foaMockAttempts = foaSessions.length
  const qafbMockAttempts = qafbSessions.length

  const chapterLabelsBySubject = new Map<string, Record<string, string>>(
    normalizedSubjects.map((subject) => [subject.code, buildChapterLabelMap(subject.chapters)])
  )
  const foaChapterLabels = chapterLabelsBySubject.get('FOA') || {}
  const qafbChapterLabels = chapterLabelsBySubject.get('QAFB') || {}

  const foaMockHistory = buildSingleMockHistory(foaSessions, foaChapterLabels)
  const qafbMockHistory = buildSingleMockHistory(qafbSessions, qafbChapterLabels)

  const latestFoaSession = foaSessions
    .slice()
    .sort(
      (a, b) =>
        (b.completedAt || b.createdAt).getTime() - (a.completedAt || a.createdAt).getTime()
    )[0]
  const latestQafbSession = qafbSessions
    .slice()
    .sort(
      (a, b) =>
        (b.completedAt || b.createdAt).getTime() - (a.completedAt || a.createdAt).getTime()
    )[0]

  const latestFoaWeakChapter = latestFoaSession
    ? extractWeakestChapterFromBreakdown(latestFoaSession.chapterBreakdown)
    : null
  const latestQafbWeakChapter = latestQafbSession
    ? extractWeakestChapterFromBreakdown(latestQafbSession.chapterBreakdown)
    : null

  const percentileGroups = await prisma.testResult.groupBy({
    by: ['userId'],
    where: {
      userId: { not: null },
      ...(window.from ? { createdAt: { gte: window.from, lte: window.to } } : {}),
    },
    _sum: {
      totalQuestions: true,
      correctAnswers: true,
    },
  })

  const percentileRows = percentileGroups
    .map((row) => {
      const total = Number(row._sum.totalQuestions) || 0
      const correct = Number(row._sum.correctAnswers) || 0
      if (total <= 0 || !row.userId) return null
      return {
        userId: row.userId,
        accuracy: (correct / total) * 100,
      }
    })
    .filter((row): row is { userId: string; accuracy: number } => Boolean(row))
    .sort((a, b) => b.accuracy - a.accuracy)

  const userRankIndex = percentileRows.findIndex((row) => row.userId === userId)
  const percentileTop =
    userRankIndex >= 0 && percentileRows.length > 0
      ? Math.max(1, Math.round(((userRankIndex + 1) / percentileRows.length) * 100))
      : null

  const comparisonMetrics: DeepAnalyticsPayload['comparison']['metrics'] = [
    {
      key: 'overall_accuracy',
      label: 'Overall Accuracy',
      you: `${Math.round(overallAccuracy)}%`,
      platform: `${Math.round(platformOverallAccuracy)}%`,
      trend: buildComparisonTrend(overallAccuracy, platformOverallAccuracy),
    },
    {
      key: 'questions_per_day',
      label: 'Questions / day',
      you: `${round(userQuestionsPerDay, 1)}`,
      platform: `${round(platformQuestionsPerDay, 1)}`,
      trend: buildComparisonTrend(userQuestionsPerDay, platformQuestionsPerDay),
    },
    {
      key: 'streak',
      label: 'Streak',
      you: `${Math.max(0, Number(user.practiceStreakCurrent) || 0)}d`,
      platform: `${round(platformStreak, 1)}d`,
      trend: buildComparisonTrend(Math.max(0, Number(user.practiceStreakCurrent) || 0), platformStreak),
    },
    {
      key: 'foa_accuracy',
      label: 'FOA Accuracy',
      you: `${Math.round(foaAccuracy)}%`,
      platform: `${Math.round(platformFoaAccuracy)}%`,
      trend: buildComparisonTrend(foaAccuracy, platformFoaAccuracy),
    },
    {
      key: 'bae_accuracy',
      label: 'BAE Accuracy',
      you: `${Math.round(baeAccuracy)}%`,
      platform: `${Math.round(platformBaeAccuracy)}%`,
      trend: buildComparisonTrend(baeAccuracy, platformBaeAccuracy),
    },
  ]

  const recommendationContext: RecommendationContext = {
    overallAccuracy: round(allTimeAccuracy, 1),
    totalQuestioned: allTotals.questions,
    daysSinceLastPractice,
    currentStreak: Math.max(0, Number(user.practiceStreakCurrent) || 0),
    examDate: user.examDate ? user.examDate.toISOString() : null,
    examReadinessScore: readiness.score,
    baeMockAttempts: baeAttempts,
    foaMockAttempts,
    qafbMockAttempts,
    latestFoaWeakChapter: latestFoaWeakChapter
      ? {
          chapterCode: latestFoaWeakChapter.chapterCode,
          chapterLabel: resolveChapterLabel(latestFoaWeakChapter.chapterCode, foaChapterLabels),
          accuracy: Math.round(latestFoaWeakChapter.accuracy),
        }
      : null,
    latestQafbWeakChapter: latestQafbWeakChapter
      ? {
          chapterCode: latestQafbWeakChapter.chapterCode,
          chapterLabel: resolveChapterLabel(latestQafbWeakChapter.chapterCode, qafbChapterLabels),
          accuracy: Math.round(latestQafbWeakChapter.accuracy),
        }
      : null,
    subjects: subjectAggregates.map((subject) => ({
      code: subject.code,
      name: subject.name,
      shortName: subject.shortName,
      slug: subject.slug,
      questionsAttempted: subject.attempted,
      totalQuestions: subject.totalQuestions,
      accuracy: subject.accuracy,
      lastPracticed: subject.lastPracticed,
      daysSinceLastPractice: subject.daysSinceLastPractice,
      recentSessions: subject.recentSessions,
    })),
    chapters: recommendationChapters,
  }

  const payload: DeepAnalyticsPayload = {
    generatedAt: now.toISOString(),
    range: {
      key: rangeKey,
      label: window.label,
      from: window.from ? window.from.toISOString() : null,
      to: window.to.toISOString(),
    },
    topStats: {
      totalQuestionsPracticed: currentTotals.questions,
      totalQuestionsTrend: questionDelta,
      overallAccuracy: round(overallAccuracy, 1),
      overallAccuracyTrend: accuracyDelta,
      streak: {
        current: Math.max(0, Number(user.practiceStreakCurrent) || 0),
        best: Math.max(0, Number(user.practiceStreakBest) || 0),
        practicedToday,
      },
      examReadiness: {
        score: readiness.score,
        trend: previousReadinessScore === null ? null : readiness.score - previousReadinessScore,
      },
    },
    readiness,
    accuracyTrend: {
      points: trendPoints,
      insight: trendInsight,
    },
    subjects: subjectAggregates.sort((a, b) => a.code.localeCompare(b.code)),
    heatmap: {
      tabs: heatmapTabs,
    },
    timeAnalysis: {
      averageTimePerQuestion,
      platformAverageTimePerQuestion:
        platformAverageTimePerQuestion === null ? null : round(Number(platformAverageTimePerQuestion), 1),
      deltaVsPlatform,
      distribution: timeDistribution,
      subjectBreakdown: subjectTimeBreakdown.sort((a, b) => a.code.localeCompare(b.code)),
      insight: buildTimeInsight(averageTimePerQuestion),
    },
    comparison: {
      metrics: comparisonMetrics,
      percentileTop,
    },
    mockHistory: {
      foa: foaMockHistory,
      qafb: qafbMockHistory,
    },
  }

  return {
    payload,
    recommendationContext,
  }
}
