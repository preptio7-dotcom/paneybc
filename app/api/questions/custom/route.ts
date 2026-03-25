export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const sampleArray = <T>(items: T[], count: number) => {
  if (count >= items.length) return items
  const shuffled = items.slice().sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function normalizePercentages(values: Record<Difficulty, number>) {
  const total = DIFFICULTIES.reduce((sum, key) => sum + (values[key] || 0), 0)
  if (total <= 0) {
    return { easy: 34, medium: 33, hard: 33 }
  }
  return {
    easy: (values.easy / total) * 100,
    medium: (values.medium / total) * 100,
    hard: (values.hard / total) * 100,
  }
}

function allocateCounts(total: number, percentages: Record<Difficulty, number>) {
  const raw = DIFFICULTIES.map((key) => ({
    key,
    value: (percentages[key] / 100) * total,
  }))
  const base = raw.map((item) => ({
    key: item.key,
    count: Math.floor(item.value),
    remainder: item.value - Math.floor(item.value),
  }))

  let remaining = total - base.reduce((sum, item) => sum + item.count, 0)
  base.sort((a, b) => b.remainder - a.remainder)

  for (const item of base) {
    if (remaining <= 0) break
    item.count += 1
    remaining -= 1
  }

  const result: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 }
  base.forEach((item) => {
    result[item.key] = item.count
  })
  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject') || ''
    const chaptersParam = searchParams.get('chapters') || ''
    const countParam = searchParams.get('count') || '25'
    const shuffle = searchParams.get('shuffle') === '1'

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    const totalCount = Math.min(Math.max(parseInt(countParam, 10) || 25, 5), 200)
    const chapterCodes = chaptersParam
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    const percentages = normalizePercentages({
      easy: Number(searchParams.get('easy') || 0),
      medium: Number(searchParams.get('medium') || 0),
      hard: Number(searchParams.get('hard') || 0),
    })

    const desired = allocateCounts(totalCount, percentages)

    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      select: { questionId: true },
    })
    const reportedIds = Array.from(new Set(reports.map((r) => r.questionId).filter(Boolean)))

    let resolvedSubject = subject.trim()
    if (resolvedSubject) {
      const normalized = resolvedSubject.replace(/\s+/g, '').toUpperCase()
      const subjects = await prisma.subject.findMany()
      const subjectDoc = subjects.find((item) => item.code.replace(/\s+/g, '').toUpperCase() === normalized)
      if (subjectDoc?.code) resolvedSubject = subjectDoc.code
    }

    const match: any = { subject: resolvedSubject }
    if (chapterCodes.length > 0) {
      match.chapter = { in: chapterCodes }
    }
    if (reportedIds.length > 0) {
      match.id = { notIn: reportedIds }
    }

    const availability = await prisma.question.groupBy({
      by: ['difficulty'],
      where: match,
      _count: { _all: true },
    })

    const availableMap = new Map<string, number>()
    availability.forEach((row: any) => {
      availableMap.set(row.difficulty, row._count?._all || 0)
    })

    const finalCounts: Record<Difficulty, number> = { ...desired }
    let deficit = 0

    DIFFICULTIES.forEach((diff) => {
      const available = availableMap.get(diff) || 0
      if (finalCounts[diff] > available) {
        deficit += finalCounts[diff] - available
        finalCounts[diff] = available
      }
    })

    if (deficit > 0) {
      const capacity = DIFFICULTIES.map((diff) => ({
        diff,
        extra: Math.max((availableMap.get(diff) || 0) - finalCounts[diff], 0),
      })).sort((a, b) => b.extra - a.extra)

      for (const item of capacity) {
        if (deficit <= 0) break
        const add = Math.min(deficit, item.extra)
        finalCounts[item.diff] += add
        deficit -= add
      }
    }

    const samplePromises = DIFFICULTIES.map(async (diff) => {
      const count = finalCounts[diff]
      if (!count) return []
      const items = await prisma.question.findMany({
        where: { ...match, difficulty: diff },
      })
      return sampleArray(items, count)
    })

    const sampled = await Promise.all(samplePromises)
    let questions = sampled.flat()

    if (shuffle && questions.length > 1) {
      questions = questions.sort(() => Math.random() - 0.5)
    }

    return NextResponse.json({
      message: 'Custom quiz questions retrieved successfully',
      count: questions.length,
      questions,
    })
  } catch (error: any) {
    console.error('Custom quiz error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

