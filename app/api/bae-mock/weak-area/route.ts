export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function roundToWhole(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

function calculateAccuracy(correct: number, total: number) {
  if (!total) return 0
  return roundToWhole((correct / total) * 100)
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const completedSessions = await prisma.baeMockSession.findMany({
      where: {
        userId: currentUser.userId,
        testType: 'bae_mock',
        completed: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        totalQuestions: true,
        vol1Count: true,
        vol2Count: true,
        vol1Correct: true,
        vol2Correct: true,
        correctAnswers: true,
        scorePercent: true,
        timeAllowed: true,
        timeTaken: true,
        completedAt: true,
        createdAt: true,
      },
    })

    const attemptCount = completedSessions.length
    const remainingForUnlock = Math.max(0, 3 - attemptCount)

    const totals = completedSessions.reduce(
      (acc, session) => {
        acc.vol1Questions += session.vol1Count
        acc.vol2Questions += session.vol2Count
        acc.vol1Correct += session.vol1Correct
        acc.vol2Correct += session.vol2Correct
        return acc
      },
      {
        vol1Questions: 0,
        vol2Questions: 0,
        vol1Correct: 0,
        vol2Correct: 0,
      }
    )

    const vol1Accuracy = calculateAccuracy(totals.vol1Correct, totals.vol1Questions)
    const vol2Accuracy = calculateAccuracy(totals.vol2Correct, totals.vol2Questions)
    const diff = Math.abs(vol1Accuracy - vol2Accuracy)
    const weakerVolume =
      vol1Accuracy === vol2Accuracy ? null : vol1Accuracy < vol2Accuracy ? 'VOL1' : 'VOL2'
    const strongerVolume =
      vol1Accuracy === vol2Accuracy ? null : vol1Accuracy > vol2Accuracy ? 'VOL1' : 'VOL2'

    const history = completedSessions
      .slice(-10)
      .reverse()
      .map((session, index, rows) => {
        const previous = rows[index + 1]
        const delta = previous ? session.scorePercent - previous.scorePercent : 0
        return {
          id: session.id,
          date: session.completedAt || session.createdAt,
          totalQuestions: session.totalQuestions,
          scorePercent: session.scorePercent,
          scoreText: `${session.correctAnswers}/${session.totalQuestions}`,
          ratioText: `Vol I: ${session.vol1Count} · Vol II: ${session.vol2Count}`,
          vol1Accuracy: calculateAccuracy(session.vol1Correct, session.vol1Count),
          vol2Accuracy: calculateAccuracy(session.vol2Correct, session.vol2Count),
          vol1Count: session.vol1Count,
          vol2Count: session.vol2Count,
          vol1Correct: session.vol1Correct,
          vol2Correct: session.vol2Correct,
          timeAllowed: session.timeAllowed,
          timeTaken: session.timeTaken || 0,
          improvementDelta: delta,
        }
      })

    return NextResponse.json({
      success: true,
      attemptCount,
      unlocked: attemptCount >= 3,
      remainingForUnlock,
      totals,
      accuracy: {
        vol1: vol1Accuracy,
        vol2: vol2Accuracy,
      },
      comparison: {
        difference: diff,
        weakerVolume,
        strongerVolume,
        balanced: diff < 10,
      },
      history,
    })
  } catch (error: any) {
    console.error('BAE weak area error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
