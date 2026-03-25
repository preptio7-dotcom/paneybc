export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMockDefinitionByRouteKey } from '@/lib/mock-tests'
import { buildSingleMockWeakAreaAnalysis } from '@/lib/mock-test-engine'

function roundToWhole(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

function calculateAccuracy(correct: number, total: number) {
  if (!total) return 0
  return roundToWhole((correct / total) * 100)
}

function isPrismaSchemaNotReadyError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022'
  }
  const message = String((error as any)?.message || '').toLowerCase()
  return (
    message.includes('does not exist') ||
    message.includes('relation') && message.includes('missing') ||
    message.includes('column') && message.includes('missing')
  )
}

function emptyBaeWeakAreaPayload() {
  return {
    success: true,
    setupRequired: true,
    attemptCount: 0,
    unlocked: false,
    remainingForUnlock: 3,
    totals: {
      vol1Questions: 0,
      vol2Questions: 0,
      vol1Correct: 0,
      vol2Correct: 0,
    },
    accuracy: {
      vol1: 0,
      vol2: 0,
    },
    comparison: {
      difference: 0,
      weakerVolume: null,
      strongerVolume: null,
      balanced: true,
    },
    history: [],
  }
}

function emptySingleWeakAreaPayload() {
  return {
    success: true,
    setupRequired: true,
    attemptCount: 0,
    unlocked: false,
    remainingForUnlock: 3,
    chapters: [],
    history: [],
    chapterLabels: {},
  }
}

async function buildBaeWeakArea(userId: string) {
  const completedSessions = await prisma.baeMockSession.findMany({
    where: {
      userId,
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
  const weakerVolume = vol1Accuracy === vol2Accuracy ? null : vol1Accuracy < vol2Accuracy ? 'VOL1' : 'VOL2'
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

  return {
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
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mockKey: string }> }
) {
  let requestedMockKey = ''
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mockKey } = await params
    requestedMockKey = mockKey
    const definition = getMockDefinitionByRouteKey(mockKey)
    if (!definition) {
      return NextResponse.json({ error: 'Unknown mock test mode' }, { status: 404 })
    }

    if (definition.testType === 'bae_mock') {
      return NextResponse.json(await buildBaeWeakArea(currentUser.userId))
    }

    return NextResponse.json(
      await buildSingleMockWeakAreaAnalysis(
        prisma,
        currentUser.userId,
        definition.testType as 'foa_mock' | 'qafb_mock'
      )
    )
  } catch (error: any) {
    if (isPrismaSchemaNotReadyError(error)) {
      const definition = getMockDefinitionByRouteKey(requestedMockKey)
      if (definition?.testType === 'bae_mock') {
        return NextResponse.json(emptyBaeWeakAreaPayload())
      }
      return NextResponse.json(emptySingleWeakAreaPayload())
    }
    console.error('mock weak area error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
