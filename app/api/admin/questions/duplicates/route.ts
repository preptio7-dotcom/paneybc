export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subject = (searchParams.get('subject') || '').trim()
    const chapter = (searchParams.get('chapter') || '').trim()

    const where: any = {}
    if (subject) where.subject = subject
    if (chapter) where.chapter = chapter

    const questions = await prisma.question.findMany({
      where,
      select: {
        id: true,
        subject: true,
        chapter: true,
        question: true,
        options: true,
        correctAnswer: true,
        correctAnswers: true,
        allowMultiple: true,
        maxSelections: true,
        explanation: true,
        difficulty: true,
        createdAt: true,
      },
    })

    const groups = new Map<string, any[]>()
    questions.forEach((q) => {
      const questionText = normalize(q.question || '')
      const optionKey = (q.options || []).map((opt) => normalize(opt || '')).join('|')
      const correctKey =
        q.correctAnswers && q.correctAnswers.length > 0
          ? [...q.correctAnswers].sort().join(',')
          : typeof q.correctAnswer === 'number'
            ? String(q.correctAnswer)
            : ''
      const chapterKey = normalize(q.chapter || '')
      const subjectKey = normalize(q.subject || '')
      const key = [
        subjectKey,
        chapterKey,
        questionText,
        optionKey,
        correctKey,
        q.allowMultiple ? '1' : '0',
        String(q.maxSelections || 1),
      ].join('::')

      const list = groups.get(key) || []
      list.push(q)
      groups.set(key, list)
    })

    const duplicateGroups = Array.from(groups.values())
      .filter((items) => items.length > 1)
      .map((items) => ({
        count: items.length,
        items: items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      totalGroups: duplicateGroups.length,
      groups: duplicateGroups,
    })
  } catch (error: any) {
    console.error('Duplicate questions error:', error)
    return NextResponse.json({ error: 'Failed to load duplicates' }, { status: 500 })
  }
}
