export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { buildReviewUpdate } from '@/lib/spaced-repetition'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, subject, answers, duration } = body

    if (!subject || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const tokenUser = getCurrentUser(request)
    const resolvedUserId = userId || tokenUser?.userId

    const rawAnswers = Array.isArray(answers) ? answers : []
    let normalizedAnswers = rawAnswers

    const totalQuestions = rawAnswers.length
    const correctAnswers = rawAnswers.filter((a: any) => a.isCorrect).length
    const wrongAnswers = rawAnswers.filter((a: any) => {
      const selected = a.selectedAnswer
      const hasSelection = Array.isArray(selected) ? selected.length > 0 : selected !== -1
      return !a.isCorrect && hasSelection
    }).length
    const notAttempted = rawAnswers.filter((a: any) => {
      const selected = a.selectedAnswer
      return Array.isArray(selected) ? selected.length === 0 : selected === -1
    }).length
    const score = Math.round((correctAnswers / totalQuestions) * 100)

    let weightedScore = 0
    let weightedTotal = 0
    let weightedPercent = score

    if (subject && rawAnswers.length > 0) {
      const questionIds = rawAnswers
        .map((answer: any) => answer.questionId)
        .filter((questionId: string) => typeof questionId === 'string' && questionId.length > 0)

      if (questionIds.length > 0) {
        const [subjectDoc, questions] = await Promise.all([
          prisma.subject.findUnique({ where: { code: subject } }),
          prisma.question.findMany({ where: { id: { in: questionIds } } }),
        ])

        const weightMap = new Map<string, number>()
        ;(subjectDoc?.chapters || []).forEach((chapter: any) => {
          const weight = typeof chapter.weightage === 'number' && chapter.weightage > 0 ? chapter.weightage : 1
          weightMap.set(chapter.code, weight)
        })

        const questionMap = new Map<string, any>()
        questions.forEach((q: any) => {
          questionMap.set(q.id, q)
        })

        normalizedAnswers = rawAnswers.map((answer: any) => {
          const question = questionMap.get(answer.questionId)
          return {
            ...answer,
            subject: answer.subject || question?.subject || subject,
            questionNumber: typeof answer.questionNumber === 'number'
              ? answer.questionNumber
              : question?.questionNumber,
          }
        })

        normalizedAnswers.forEach((answer: any) => {
          const question = questionMap.get(answer.questionId)
          const weight = weightMap.get(question?.chapter) || 1
          weightedTotal += weight
          if (answer.isCorrect) {
            weightedScore += weight
          }
        })

        if (weightedTotal > 0) {
          weightedPercent = Math.round((weightedScore / weightedTotal) * 100)
        }
      }
    }

    const passed = weightedPercent >= 50

    const result = await prisma.testResult.create({
      data: {
        userId: resolvedUserId || 'guest',
        subject,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        notAttempted,
        score,
        weightedScore,
        weightedTotal,
        weightedPercent,
        passed,
        answers: normalizedAnswers,
        duration: duration || 0,
      },
    })

    if (resolvedUserId) {
      const now = new Date()
      const questionIds = normalizedAnswers
        .map((answer: any) => answer.questionId)
        .filter((questionId: string) => typeof questionId === 'string' && questionId.length > 0)

      if (questionIds.length > 0) {
        const existing = await prisma.reviewSchedule.findMany({
          where: { userId: resolvedUserId, questionId: { in: questionIds } },
        })

        const existingMap = new Map<string, any>()
        existing.forEach(schedule => {
          existingMap.set(schedule.questionId, schedule)
        })

        const ops = answers
          .filter((answer: any) => typeof answer.questionId === 'string' && answer.questionId.length > 0)
          .map((answer: any) => {
            const previous = existingMap.get(answer.questionId)
            const update = buildReviewUpdate({
              previous,
              isCorrect: Boolean(answer.isCorrect),
              now,
            })

            return prisma.reviewSchedule.upsert({
              where: {
                userId_questionId: {
                  userId: resolvedUserId,
                  questionId: answer.questionId,
                },
              },
              update,
              create: {
                userId: resolvedUserId,
                questionId: answer.questionId,
                ...update,
              },
            })
          })

        if (ops.length > 0) {
          await Promise.all(ops)
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Test result saved successfully',
        result,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Results creation error (Full):', JSON.stringify(error, null, 2))
    console.error('Results creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      {
        message: 'Results retrieved successfully',
        results,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Results fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

