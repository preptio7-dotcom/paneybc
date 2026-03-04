export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BAE_VOL1_NAME, BAE_VOL2_NAME, type BaeSessionQuestionRef, type BaeVolume } from '@/lib/bae-mock'

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

function sanitizeSelectedAnswer(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0)
    .slice(0, 8)
}

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
    const session = await prisma.baeMockSession.findFirst({
      where: {
        id,
        userId: currentUser.userId,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const questionSet = parseQuestionSet(session.questionSet)
    const questionIds = questionSet.map((item) => item.questionId)

    const dbQuestions = questionIds.length
      ? await prisma.question.findMany({
          where: {
            id: { in: questionIds },
          },
          select: {
            id: true,
            subject: true,
            questionNumber: true,
            question: true,
            imageUrl: true,
            options: true,
            explanation: true,
            difficulty: true,
            allowMultiple: true,
            maxSelections: true,
          },
        })
      : []

    const questionMap = new Map(dbQuestions.map((question) => [question.id, question]))
    const questions = questionSet
      .map((item, index) => {
        const question = questionMap.get(item.questionId)
        if (!question) return null
        return {
          index,
          id: question.id,
          subject: question.subject,
          questionNumber: question.questionNumber,
          question: question.question,
          imageUrl: question.imageUrl,
          options: question.options,
          explanation: question.explanation,
          difficulty: question.difficulty,
          allowMultiple: question.allowMultiple,
          maxSelections: question.maxSelections,
          volume: item.volume,
          volumeLabel: item.volume === 'VOL1' ? BAE_VOL1_NAME : BAE_VOL2_NAME,
        }
      })
      .filter(Boolean)

    const storedAnswers = Array.isArray(session.answers) ? (session.answers as any[]) : []
    const answersByIndex = new Map<number, number[]>()
    storedAnswers.forEach((answer) => {
      const index = Number(answer?.index)
      if (!Number.isInteger(index)) return
      answersByIndex.set(index, sanitizeSelectedAnswer(answer?.selectedAnswer))
    })

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        completed: session.completed,
        status: session.status,
        totalQuestions: session.totalQuestions,
        timeAllowed: session.timeAllowed,
        timeTaken: session.timeTaken,
        vol1Count: session.vol1Count,
        vol2Count: session.vol2Count,
        vol1Correct: session.vol1Correct,
        vol2Correct: session.vol2Correct,
        correctAnswers: session.correctAnswers,
        wrongAnswers: session.wrongAnswers,
        notAttempted: session.notAttempted,
        scorePercent: session.scorePercent,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
      questions,
      answers: questions.map((question) => answersByIndex.get((question as any).index) || []),
    })
  } catch (error: any) {
    console.error('BAE mock session fetch error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
