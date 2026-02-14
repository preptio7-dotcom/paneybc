export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // 1. Get all results for user
    const results = await prisma.testResult.findMany({ where: { userId } })

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
        counts: { total: 0, easy: 0, medium: 0, hard: 0 }
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
          counts: { total: 0, easy: 0, medium: 0, hard: 0 }
        }
      }
      subjectStats[res.subject].totalAttempted += res.totalQuestions
      subjectStats[res.subject].correct += res.correctAnswers
      subjectStats[res.subject].scoreSum += res.score
      subjectStats[res.subject].testCount += 1
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
        testCount: stats.testCount
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

    return NextResponse.json({
      message: 'Dashboard stats retrieved successfully',
      stats: formattedStats,
      globalStats: {
        totalTests: globalTestCount,
        totalQuestionsPracticed: globalTotalAttempted,
        averageAccuracy: globalAccuracy
      }
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

