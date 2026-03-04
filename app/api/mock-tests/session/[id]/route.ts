export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMockDefinitionByType } from '@/lib/mock-tests'
import { getMockSessionPayload } from '@/lib/mock-test-engine'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const payload = await getMockSessionPayload(prisma, currentUser.userId, id)
    if (!payload) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const definition = getMockDefinitionByType(payload.session.testType)
    if (!definition) {
      return NextResponse.json({ error: 'Unknown mock test session type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      definition: {
        routeKey: definition.routeKey,
        testType: definition.testType,
        testName: definition.testName,
        isCombined: definition.isCombined,
        subjects: definition.subjects,
        gradientFrom: definition.gradientFrom,
        gradientTo: definition.gradientTo,
      },
      session: {
        id: payload.session.id,
        testType: payload.session.testType,
        completed: payload.session.completed,
        status: payload.session.status,
        totalQuestions: payload.session.totalQuestions,
        timeAllowed: payload.session.timeAllowed,
        timeTaken: payload.session.timeTaken,
        vol1Count: payload.session.vol1Count,
        vol2Count: payload.session.vol2Count,
        vol1Correct: payload.session.vol1Correct,
        vol2Correct: payload.session.vol2Correct,
        correctAnswers: payload.session.correctAnswers,
        wrongAnswers: payload.session.wrongAnswers,
        notAttempted: payload.session.notAttempted,
        scorePercent: payload.session.scorePercent,
        chapterBreakdown: payload.session.chapterBreakdown || {},
        startedAt: payload.session.startedAt,
        completedAt: payload.session.completedAt,
      },
      questions: payload.questions,
      answers: payload.answers,
      chapterLabels: payload.chapterLabels || {},
    })
  } catch (error: any) {
    console.error('mock session fetch error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
