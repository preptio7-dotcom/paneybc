export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateUserPracticeStreak } from '@/lib/practice-streak'
import { invalidateUserRecommendationCache } from '@/lib/study-recommendations'
import { type BaeSessionQuestionRef, type BaeVolume } from '@/lib/bae-mock'

type SubmitPayload = {
  answers?: unknown[]
  timeTakenSeconds?: number
}

function parseQuestionSet(value: unknown): BaeSessionQuestionRef[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const questionId = String((item as any).questionId || '').trim()
      const volume = String((item as any).volume || '').toUpperCase() as BaeVolume
      if (!questionId) return null
      if (volume !== 'VOL1' && volume !== 'VOL2') return null
      return { questionId, volume }
    })
    .filter(Boolean) as BaeSessionQuestionRef[]
}

function normalizeSelectedAnswer(value: unknown) {
  const selected = Array.isArray(value) ? value : typeof value === 'number' ? [value] : []
  const normalized = selected
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 20)

  return Array.from(new Set(normalized)).sort((a, b) => a - b)
}

function isAnswerCorrect(question: { correctAnswer: number | null; correctAnswers: number[] }, selected: number[]) {
  const answerKey =
    Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
      ? question.correctAnswers.slice().sort((a, b) => a - b)
      : typeof question.correctAnswer === 'number'
        ? [question.correctAnswer]
        : []
  if (!answerKey.length) return false
  if (answerKey.length !== selected.length) return false
  return answerKey.every((entry, index) => selected[index] === entry)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const session = await prisma.baeMockSession.findFirst({
      where: {
        id,
        userId: currentUser.userId,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.completed) {
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        alreadyCompleted: true,
        summary: {
          totalQuestions: session.totalQuestions,
          correctAnswers: session.correctAnswers,
          wrongAnswers: session.wrongAnswers,
          notAttempted: session.notAttempted,
          scorePercent: session.scorePercent,
          vol1Count: session.vol1Count,
          vol2Count: session.vol2Count,
          vol1Correct: session.vol1Correct,
          vol2Correct: session.vol2Correct,
          timeAllowed: session.timeAllowed,
          timeTaken: session.timeTaken,
        },
      })
    }

    const body = (await request.json().catch(() => ({}))) as SubmitPayload
    const incomingAnswers = Array.isArray(body.answers) ? body.answers : []
    const questionSet = parseQuestionSet(session.questionSet)
    const questionIds = questionSet.map((item) => item.questionId)

    const questionRecords = questionIds.length
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: {
            id: true,
            correctAnswer: true,
            correctAnswers: true,
          },
        })
      : []
    const questionMap = new Map(questionRecords.map((question) => [question.id, question]))

    let correctAnswers = 0
    let wrongAnswers = 0
    let notAttempted = 0
    let vol1Correct = 0
    let vol2Correct = 0

    const storedAnswers = questionSet.map((item, index) => {
      const selected = normalizeSelectedAnswer(incomingAnswers[index])
      const question = questionMap.get(item.questionId)

      if (!question) {
        return {
          index,
          questionId: item.questionId,
          volume: item.volume,
          selectedAnswer: selected,
          isCorrect: false,
          attempted: selected.length > 0,
        }
      }

      if (selected.length === 0) {
        notAttempted += 1
        return {
          index,
          questionId: item.questionId,
          volume: item.volume,
          selectedAnswer: [],
          isCorrect: false,
          attempted: false,
        }
      }

      const correct = isAnswerCorrect(question, selected)
      if (correct) {
        correctAnswers += 1
        if (item.volume === 'VOL1') vol1Correct += 1
        if (item.volume === 'VOL2') vol2Correct += 1
      } else {
        wrongAnswers += 1
      }

      return {
        index,
        questionId: item.questionId,
        volume: item.volume,
        selectedAnswer: selected,
        isCorrect: correct,
        attempted: true,
      }
    })

    const safeTotal = questionSet.length
    const scorePercent = safeTotal > 0 ? Math.round((correctAnswers / safeTotal) * 100) : 0
    const rawTimeTaken = Number(body.timeTakenSeconds) || 0
    const timeTaken = Math.max(0, Math.min(Math.floor(rawTimeTaken), session.timeAllowed * 60))

    const completedSession = await prisma.baeMockSession.update({
      where: { id: session.id },
      data: {
        completed: true,
        status: 'completed',
        completedAt: new Date(),
        timeTaken,
        correctAnswers,
        wrongAnswers,
        notAttempted,
        scorePercent,
        vol1Correct,
        vol2Correct,
        answers: storedAnswers,
      },
      select: {
        id: true,
        totalQuestions: true,
        correctAnswers: true,
        wrongAnswers: true,
        notAttempted: true,
        scorePercent: true,
        vol1Count: true,
        vol2Count: true,
        vol1Correct: true,
        vol2Correct: true,
        timeAllowed: true,
        timeTaken: true,
      },
    })

    if (completedSession.totalQuestions > 0) {
      void updateUserPracticeStreak(prisma, currentUser.userId, new Date(), {
        endpoint: '/api/bae-mock/session/submit',
      }).catch((error: any) => {
        console.error('BAE mock streak update failed:', error)
      })
      void invalidateUserRecommendationCache(prisma, currentUser.userId).catch((error: any) => {
        console.error('BAE mock recommendation cache invalidation failed:', error)
      })
    }

    return NextResponse.json({
      success: true,
      sessionId: completedSession.id,
      summary: completedSession,
    })
  } catch (error: any) {
    console.error('BAE mock submit error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
