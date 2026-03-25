export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const minAttempts = Math.max(parseInt(searchParams.get('minAttempts') || '3', 10), 1)

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const results = await prisma.testResult.findMany({ where: { userId } })
    const answers = results
      .flatMap((r: any) => (Array.isArray(r.answers) ? r.answers : []))
      .filter((a: any) => a.selectedAnswer !== -1)

    const questionIds = answers.map((a: any) => a.questionId).filter(Boolean)
    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      select: { questionId: true },
    })
    const reportedIds = new Set(reports.map((r) => r.questionId).filter(Boolean))

    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds, ...(reportedIds.size ? { notIn: Array.from(reportedIds) } : {}) },
      },
      select: { id: true, subject: true, chapter: true },
    })

    const questionMap = new Map<string, any>()
    questions.forEach((q) => questionMap.set(q.id, q))

    const statsMap = new Map<string, { subject: string; chapter: string; attempts: number; correct: number }>()

    answers.forEach((a: any) => {
      const q = questionMap.get(a.questionId)
      if (!q || !q.chapter) return
      const key = `${q.subject}::${q.chapter}`
      const entry = statsMap.get(key) || { subject: q.subject, chapter: q.chapter, attempts: 0, correct: 0 }
      entry.attempts += 1
      if (a.isCorrect) entry.correct += 1
      statsMap.set(key, entry)
    })

    const ranked = Array.from(statsMap.values())
      .filter((row) => row.attempts >= minAttempts && row.chapter)
      .map((row) => ({
        ...row,
        accuracy: row.attempts ? row.correct / row.attempts : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
      .slice(0, 3)

    return NextResponse.json({
      weakAreas: ranked.map((row: any) => ({
        subject: row.subject,
        chapter: row.chapter,
        attempts: row.attempts,
        correct: row.correct,
        accuracy: Math.round((row.accuracy || 0) * 100),
      }))
    })
  } catch (error: any) {
    console.error('Weak areas error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

