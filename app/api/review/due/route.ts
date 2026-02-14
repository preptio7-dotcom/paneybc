export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit') || '20'
    const subject = searchParams.get('subject')
    const countOnly = searchParams.get('countOnly') === '1'

    const limit = Math.min(parseInt(limitParam, 10) || 20, 100)
    const now = new Date()

    if (countOnly) {
      const count = await prisma.reviewSchedule.count({
        where: { userId: user.userId, nextReviewAt: { lte: now } },
      })
      return NextResponse.json({ count })
    }

    const dueSchedules = await prisma.reviewSchedule.findMany({
      where: { userId: user.userId, nextReviewAt: { lte: now } },
      orderBy: { nextReviewAt: 'asc' },
      take: limit,
    })

    const questionIds = dueSchedules
      .map(schedule => schedule.questionId)
      .filter((questionId: string) => typeof questionId === 'string' && questionId.length > 0)

    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      select: { questionId: true },
    })
    const reportedIds = new Set(reports.map((r) => r.questionId).filter(Boolean))

    const questions = await prisma.question.findMany({
      where: {
        id: {
          in: questionIds,
          ...(reportedIds.size ? { notIn: Array.from(reportedIds) } : {}),
        },
        ...(subject ? { subject: { contains: subject, mode: 'insensitive' } } : {}),
      },
    })
    const questionMap = new Map<string, any>()
    questions.forEach(question => {
      questionMap.set(question.id, question)
    })

    const dueQuestions = dueSchedules
      .map(schedule => questionMap.get(schedule.questionId))
      .filter(Boolean)

    return NextResponse.json({
      count: dueSchedules.length,
      questions: dueQuestions,
    })
  } catch (error: any) {
    console.error('Review due error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

