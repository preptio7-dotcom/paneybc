export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const latestAnswerByQuestion = new Map<string, any>()
    for (const r of results) {
      const list = Array.isArray((r as any).answers) ? (r as any).answers : []
      for (const a of list) {
        const questionId = a?.questionId
        const questionNumber = a?.questionNumber
        const subject = a?.subject
        const key = questionId ? `id:${questionId}` : (subject && typeof questionNumber === 'number')
          ? `num:${subject}::${questionNumber}`
          : null
        if (!key) continue
        if (!latestAnswerByQuestion.has(key)) {
          latestAnswerByQuestion.set(key, a)
        }
      }
    }

    const wrongEntries = Array.from(latestAnswerByQuestion.entries())
      .filter(([, a]) => a && a.isCorrect === false)

    const wrongIds = wrongEntries
      .filter(([key]) => key.startsWith('id:'))
      .map(([key]) => key.replace('id:', ''))

    const wrongNumberPairs = wrongEntries
      .filter(([key]) => key.startsWith('num:'))
      .map(([key]) => {
        const raw = key.replace('num:', '')
        const [subject, numStr] = raw.split('::')
        const questionNumber = Number(numStr)
        return subject && Number.isFinite(questionNumber) ? { subject, questionNumber } : null
      })
      .filter(Boolean) as { subject: string; questionNumber: number }[]

    if (wrongIds.length === 0 && wrongNumberPairs.length === 0) {
      return NextResponse.json({ subjects: [] })
    }

    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      select: { questionId: true },
    })
    const reportedIds = new Set(reports.map((r) => r.questionId).filter(Boolean))

    const [idQuestions, numberQuestions] = await Promise.all([
      wrongIds.length > 0
        ? prisma.question.findMany({
            where: { id: { in: wrongIds } },
            select: { id: true, subject: true },
          })
        : Promise.resolve([]),
      wrongNumberPairs.length > 0
        ? prisma.question.findMany({
            where: { OR: wrongNumberPairs },
            select: { id: true, subject: true },
          })
        : Promise.resolve([]),
    ])

    const subjectCount = new Map<string, number>()
    ;[...idQuestions, ...numberQuestions].forEach((q) => {
      if (reportedIds.has(q.id)) return
      const key = q.subject || 'Unknown'
      subjectCount.set(key, (subjectCount.get(key) || 0) + 1)
    })

    const subjects = Array.from(subjectCount.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ subjects })
  } catch (error: any) {
    console.error('Wrong answers summary error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
