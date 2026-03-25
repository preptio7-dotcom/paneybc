export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const KEYWORDS = [' not ', ' except ']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const results = await prisma.testResult.findMany({ where: { userId } })
    const answerIds = results
      .flatMap((r: any) => (Array.isArray(r.answers) ? r.answers : []))
      .map((a: any) => a.questionId)
      .filter(Boolean)

    const questions = await prisma.question.findMany({
      where: { id: { in: answerIds } },
    })
    const questionMap = new Map<string, any>()
    questions.forEach((q: any) => questionMap.set(q.id, q))

    let keywordMistakes = 0
    let keywordAttempts = 0
    const chapterStats: Record<string, { attempts: number; wrong: number }> = {}

    results.forEach((r: any) => {
      const answers = Array.isArray(r.answers) ? r.answers : []
      answers.forEach((a: any) => {
        const q = questionMap.get(a.questionId)
        if (!q) return
        const chapter = q.chapter || 'Unknown'
        if (!chapterStats[chapter]) chapterStats[chapter] = { attempts: 0, wrong: 0 }
        chapterStats[chapter].attempts += 1
        if (!a.isCorrect && a.selectedAnswer !== -1) {
          chapterStats[chapter].wrong += 1
        }

        const text = ` ${String(q.question || '').toLowerCase()} `
        if (KEYWORDS.some((k) => text.includes(k))) {
          keywordAttempts += 1
          if (!a.isCorrect) keywordMistakes += 1
        }
      })
    })

    const weakChapters = Object.entries(chapterStats)
      .map(([chapter, stats]) => ({
        chapter,
        accuracy: stats.attempts ? Math.round(((stats.attempts - stats.wrong) / stats.attempts) * 100) : 0,
        attempts: stats.attempts,
      }))
      .filter((c) => c.attempts >= 5)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5)

    return NextResponse.json({
      keywordMistakes,
      keywordAttempts,
      weakChapters,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

