export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [totalResults, results, settings] = await Promise.all([
      prisma.testResult.count(),
      prisma.testResult.findMany({ select: { duration: true, totalQuestions: true, createdAt: true, answers: true } }),
      prisma.systemSettings.findFirst({ select: { testSettings: true } }),
    ])

    let durationSum = 0
    let questionSum = 0
    const usageByHourMap = new Map<number, number>()
    const questionStats = new Map<string, { attempts: number; correct: number }>()

    results.forEach((r: any) => {
      durationSum += r.duration || 0
      questionSum += r.totalQuestions || 0
      const hour = new Date(r.createdAt).getHours()
      usageByHourMap.set(hour, (usageByHourMap.get(hour) || 0) + 1)

      const answers = Array.isArray(r.answers) ? r.answers : []
      answers.forEach((a: any) => {
        if (!a?.questionId) return
        const stat = questionStats.get(a.questionId) || { attempts: 0, correct: 0 }
        stat.attempts += 1
        if (a.isCorrect) stat.correct += 1
        questionStats.set(a.questionId, stat)
      })
    })

    const avgDuration = totalResults > 0 ? durationSum / totalResults : 0
    const avgQuestions = totalResults > 0 ? questionSum / totalResults : 0

    const accuracyByQuestion = Array.from(questionStats.entries())
      .map(([id, stat]) => ({
        _id: id,
        attempts: stat.attempts,
        accuracy: stat.attempts ? stat.correct / stat.attempts : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10)

    const easyIds = accuracyByQuestion.filter((q) => q.accuracy < 0.3).map((q) => q._id)
    const easyQuestions = easyIds.length > 0
      ? await prisma.question.findMany({ where: { id: { in: easyIds } }, select: { question: true } })
      : []

    const tooEasyQuestions = Array.from(questionStats.entries())
      .map(([id, stat]) => ({
        _id: id,
        attempts: stat.attempts,
        accuracy: stat.attempts ? stat.correct / stat.attempts : 0,
      }))
      .filter((q) => q.accuracy > 0.9 && q.attempts >= 5)
      .slice(0, 10)

    const mostAttempted = Array.from(questionStats.entries())
      .map(([id, stat]) => ({ _id: id, attempts: stat.attempts }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10)

    const usageByHour = Array.from(usageByHourMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, count]) => ({ _id: hour, count }))

    const savedTestSettings = asObject(settings?.testSettings)
    const lastRunRaw = asObject(
      savedTestSettings.platformStatsLastRun ?? savedTestSettings.platformStatsDailyLastRun
    )
    const status = lastRunRaw.status === 'success' || lastRunRaw.status === 'failed' ? lastRunRaw.status : null
    const runAt = typeof lastRunRaw.runAt === 'string' ? lastRunRaw.runAt : null

    return NextResponse.json({
      totalResults,
      avgDuration,
      avgQuestions,
      lowAccuracyQuestionIds: accuracyByQuestion.map((q: any) => q._id),
      lowAccuracySample: easyQuestions,
      tooEasyQuestions,
      mostAttempted,
      usageByHour,
      platformStatsLastRun:
        status && runAt
          ? {
              status,
              runAt,
              dayKey: typeof lastRunRaw.dayKey === 'string' ? lastRunRaw.dayKey : null,
              triggeredBy: typeof lastRunRaw.triggeredBy === 'string' ? lastRunRaw.triggeredBy : null,
              error: typeof lastRunRaw.error === 'string' ? lastRunRaw.error : null,
            }
          : null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

