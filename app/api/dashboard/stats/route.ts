export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { computePracticeStreak } from '@/lib/practice-streak'
import { getConfiguredStreakResetTimezone, getDateKeyInTimezone } from '@/lib/streak-settings'
import { NextRequest, NextResponse } from 'next/server'

function getAnswerKey(answer: any) {
  if (!answer) return null
  const questionId = String(answer.questionId || '').trim()
  if (questionId) return `id:${questionId}`
  const subject = String(answer.subject || '').trim()
  const questionNumber = Number(answer.questionNumber)
  if (subject && Number.isFinite(questionNumber)) {
    return `num:${subject}::${questionNumber}`
  }
  return null
}

function estimateWrongAnswersSessionCount(results: any[]) {
  let sessions = 0
  const activeWrongKeys = new Set<string>()

  for (const result of results) {
    const answers = Array.isArray((result as any).answers) ? (result as any).answers : []
    const sessionKeys = Array.from(new Set(answers.map((answer: any) => getAnswerKey(answer)).filter(Boolean)))
    if (sessionKeys.length > 0 && sessionKeys.every((key) => activeWrongKeys.has(String(key)))) {
      sessions += 1
    }

    for (const answer of answers) {
      const key = getAnswerKey(answer)
      if (!key) continue
      if (answer?.isCorrect === false) {
        activeWrongKeys.add(key)
      } else if (answer?.isCorrect === true) {
        activeWrongKeys.delete(key)
      }
    }
  }

  return sessions
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // 1. Get all results for user
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    // 2. Get total questions count per subject and difficulty
    const statsBySubjectAndDifficulty = await prisma.question.groupBy({
      by: ['subject', 'difficulty'],
      _count: { _all: true },
    })

    // 3. Get all subjects from DB
    const subjects = await prisma.subject.findMany({ select: { code: true } })
    const subjectCodes = subjects.map(s => s.code)

    const subjectStats: Record<string, any> = {}

    // Initialize with 0s for all database subjects
    subjectCodes.forEach(s => {
      subjectStats[s] = {
        totalAttempted: 0,
        correct: 0,
        scoreSum: 0,
        testCount: 0,
        counts: { total: 0, easy: 0, medium: 0, hard: 0 },
        lastPracticedAt: null as Date | null,
      }
    })

    // Map the real counts from DB
    statsBySubjectAndDifficulty.forEach(item => {
      const { subject, difficulty } = item
      if (subjectStats[subject]) {
        const count = item._count?._all || 0
        subjectStats[subject].counts.total += count
        if (['easy', 'medium', 'hard'].includes(difficulty)) {
          subjectStats[subject].counts[difficulty as 'easy' | 'medium' | 'hard'] += count
        }
      }
    })

    // Aggregate user results
    results.forEach(res => {
      if (!subjectStats[res.subject]) {
        subjectStats[res.subject] = {
          totalAttempted: 0,
          correct: 0,
          scoreSum: 0,
          testCount: 0,
          counts: { total: 0, easy: 0, medium: 0, hard: 0 },
          lastPracticedAt: null as Date | null,
        }
      }
      subjectStats[res.subject].totalAttempted += res.totalQuestions
      subjectStats[res.subject].correct += res.correctAnswers
      subjectStats[res.subject].scoreSum += res.score
      subjectStats[res.subject].testCount += 1
      if (
        !subjectStats[res.subject].lastPracticedAt ||
        res.createdAt > subjectStats[res.subject].lastPracticedAt
      ) {
        subjectStats[res.subject].lastPracticedAt = res.createdAt
      }
    })

    // Calculate final stats
    const formattedStats = Object.keys(subjectStats).map(code => {
      const stats = subjectStats[code]
      const subjectTotal = stats.counts.total || 0

      return {
        code,
        accuracy: stats.testCount > 0 ? Math.round(stats.scoreSum / stats.testCount) : 0,
        completedQuestions: stats.totalAttempted,
        totalQuestions: subjectTotal,
        difficultyCounts: stats.counts,
        progressPercent: subjectTotal > 0 ? Math.min(Math.round((stats.totalAttempted / subjectTotal) * 100), 100) : 0,
        testCount: stats.testCount,
        lastPracticedAt: stats.lastPracticedAt || null,
      }
    })

    // Calculate global aggregates
    let globalTotalAttempted = 0
    let globalCorrect = 0
    let globalScoreSum = 0
    let globalTestCount = 0

    Object.values(subjectStats).forEach(s => {
      globalTotalAttempted += s.totalAttempted
      globalCorrect += s.correct
      globalScoreSum += s.scoreSum
      globalTestCount += s.testCount
    })

    const globalAccuracy = globalTestCount > 0 ? Math.round(globalScoreSum / globalTestCount) : 0
    const timezone = await getConfiguredStreakResetTimezone(prisma)
    const todayKey = getDateKeyInTimezone(new Date(), timezone)
    const questionsToday = results
      .filter((result) => getDateKeyInTimezone(result.createdAt, timezone) === todayKey)
      .reduce((sum, result) => sum + (result.totalQuestions || 0), 0)

    const practiceDateKeys = results
      .filter((result) => (result.totalQuestions || 0) > 0)
      .map((result) => getDateKeyInTimezone(result.createdAt, timezone))
    const computedFromResults = computePracticeStreak(practiceDateKeys)

    const userStreak = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        practiceStreakCurrent: true,
        practiceStreakBest: true,
        practiceStreakLastDate: true,
      },
    })

    const persistedLastPracticeKey = userStreak?.practiceStreakLastDate
      ? getDateKeyInTimezone(userStreak.practiceStreakLastDate, timezone)
      : null

    const resolvedStreak = userStreak
      ? {
          current: Number(userStreak.practiceStreakCurrent) || 0,
          best: Number(userStreak.practiceStreakBest) || 0,
          lastPracticeDate: persistedLastPracticeKey,
          practicedToday: persistedLastPracticeKey === todayKey,
        }
      : {
          current: computedFromResults.current,
          best: computedFromResults.best,
          lastPracticeDate: computedFromResults.lastPracticeKey,
          practicedToday: computedFromResults.lastPracticeKey === todayKey,
        }

    const startedSubjects = formattedStats.filter((item) => item.completedQuestions > 0).length
    const wrongAnswersSessions = estimateWrongAnswersSessionCount(results)
    const [
      weakAreaCompletions,
      financialStatementsCompletions,
      baeMockCompletions,
      foaMockCompletions,
      qafbMockCompletions,
    ] = await Promise.all([
      prisma.streakAuditLog.count({
        where: {
          userId,
          endpoint: '/api/weak-areas/complete',
        },
      }),
      prisma.financialStatementAttempt.count({
        where: {
          userId,
          status: 'completed',
        },
      }),
      prisma.baeMockSession.count({
        where: {
          userId,
          testType: 'bae_mock',
          completed: true,
        },
      }),
      prisma.baeMockSession.count({
        where: {
          userId,
          testType: 'foa_mock',
          completed: true,
        },
      }),
      prisma.baeMockSession.count({
        where: {
          userId,
          testType: 'qafb_mock',
          completed: true,
        },
      }),
    ])

    return NextResponse.json({
      message: 'Dashboard stats retrieved successfully',
      stats: formattedStats,
      globalStats: {
        totalTests: globalTestCount,
        totalQuestionsPracticed: globalTotalAttempted,
        averageAccuracy: globalAccuracy,
        todayQuestionsPracticed: questionsToday,
        startedSubjects,
        streak: {
          current: resolvedStreak.current,
          best: resolvedStreak.best,
          practicedToday: resolvedStreak.practicedToday,
          lastPracticeDate: resolvedStreak.lastPracticeDate,
          timezone,
        },
        modeCompletions: {
          baeMock: baeMockCompletions,
          foaMock: foaMockCompletions,
          qafbMock: qafbMockCompletions,
          weekIntensive: weakAreaCompletions,
          wrongAnswers: wrongAnswersSessions,
          financialStatements: financialStatementsCompletions,
        },
      },
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

