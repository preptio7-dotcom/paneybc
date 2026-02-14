export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const subject = searchParams.get('subject')

    if (!userId || !subject) {
      return NextResponse.json({ error: 'User ID and subject are required' }, { status: 400 })
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
        const answerSubject = a?.subject
        const key = questionId ? `id:${questionId}` : (answerSubject && typeof questionNumber === 'number')
          ? `num:${answerSubject}::${questionNumber}`
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
        const [answerSubject, numStr] = raw.split('::')
        const questionNumber = Number(numStr)
        if (!answerSubject || answerSubject !== subject) return null
        return Number.isFinite(questionNumber) ? { subject: answerSubject, questionNumber } : null
      })
      .filter(Boolean) as { subject: string; questionNumber: number }[]

    if (wrongIds.length === 0 && wrongNumberPairs.length === 0) {
      return NextResponse.json({ questions: [] })
    }

    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      select: { questionId: true },
    })
    const reportedIds = new Set(reports.map((r) => r.questionId).filter(Boolean))

    const [idQuestions, numberQuestions] = await Promise.all([
      wrongIds.length > 0
        ? prisma.question.findMany({
            where: { id: { in: wrongIds }, subject },
            orderBy: { questionNumber: 'asc' },
          })
        : Promise.resolve([]),
      wrongNumberPairs.length > 0
        ? prisma.question.findMany({
            where: { OR: wrongNumberPairs },
            orderBy: { questionNumber: 'asc' },
          })
        : Promise.resolve([]),
    ])

    const merged = [...idQuestions, ...numberQuestions]
    const uniqueMap = new Map<string, any>()
    merged.forEach((q) => {
      if (reportedIds.has(q.id)) return
      const key = q.id || `${q.subject || ''}-${q.questionNumber || ''}`
      if (!uniqueMap.has(key)) uniqueMap.set(key, q)
    })
    const questions = Array.from(uniqueMap.values())
      .sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
      .slice(0, 50)

    return NextResponse.json({ questions })
  } catch (error: any) {
    console.error('Wrong answers fetch error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
