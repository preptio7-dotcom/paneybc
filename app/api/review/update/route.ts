export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { buildReviewUpdate } from '@/lib/spaced-repetition'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const answers = Array.isArray(body.answers) ? body.answers : []

    if (answers.length === 0) {
      return NextResponse.json({ error: 'No answers provided' }, { status: 400 })
    }

    const validAnswers = answers.filter((answer: any) => typeof answer.questionId === 'string' && answer.questionId.length > 0)
    if (validAnswers.length === 0) {
      return NextResponse.json({ error: 'No valid question IDs provided' }, { status: 400 })
    }

    const questionIds = validAnswers.map((answer: any) => answer.questionId)

    const existing = await prisma.reviewSchedule.findMany({
      where: { userId: user.userId, questionId: { in: questionIds } },
    })

    const existingMap = new Map<string, any>()
    existing.forEach(schedule => {
      existingMap.set(schedule.questionId, schedule)
    })

    const now = new Date()
    const ops = validAnswers.map((answer: any) => {
      const previous = existingMap.get(answer.questionId)
      const update = buildReviewUpdate({
        previous,
        isCorrect: Boolean(answer.isCorrect),
        now,
      })

      return prisma.reviewSchedule.upsert({
        where: {
          userId_questionId: {
            userId: user.userId,
            questionId: answer.questionId,
          },
        },
        update,
        create: {
          userId: user.userId,
          questionId: answer.questionId,
          ...update,
        },
      })
    })

    await Promise.all(ops)

    return NextResponse.json({ message: 'Review schedule updated' }, { status: 200 })
  } catch (error: any) {
    console.error('Review update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

