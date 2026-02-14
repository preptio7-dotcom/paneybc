export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const sampleArray = <T>(items: T[], count: number) => {
  if (count >= items.length) return items
  const shuffled = items.slice().sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const chapter = searchParams.get('chapter')
    const limitParam = searchParams.get('limit') || '40'
    const pageParam = searchParams.get('page') || '1'
    const search = (searchParams.get('search') || '').trim()
    const shuffle = searchParams.get('shuffle') === '1'
    const fullBook = searchParams.get('fullbook') === '1'
    const difficulty = (searchParams.get('difficulty') || '').trim().toLowerCase()
    const reportedOnly = searchParams.get('reported') === '1'
    const includeReported = searchParams.get('includeReported') === '1'
    const multipleOnly = searchParams.get('multiple') === '1'
    const hasImageOnly = searchParams.get('hasImage') === '1'
    const newlyAdded = searchParams.get('new') === '1'
    const limitValue = limitParam === 'all' ? null : parseInt(limitParam, 10)
    const pageValue = Math.max(parseInt(pageParam, 10) || 1, 1)

    const normalizedSubject = subject?.trim() ? subject.trim().toUpperCase() : null
    const normalizedChapter = chapter?.trim() ? chapter.trim() : null

    let resolvedSubjectCode = normalizedSubject
    let resolvedSubjectDoc: any = null
    if (normalizedSubject) {
      const allSubjects = await prisma.subject.findMany()
      resolvedSubjectDoc = allSubjects.find(
        (item) => item.code.replace(/\s+/g, '').toUpperCase() === normalizedSubject
      )
      if (resolvedSubjectDoc?.code) {
        resolvedSubjectCode = resolvedSubjectDoc.code
      }
    }

    let query: any = {}
    if (resolvedSubjectCode) {
      query.subject = resolvedSubjectCode
    }
    if (normalizedChapter) {
      query.chapter = { contains: normalizedChapter, mode: 'insensitive' }
    }
    if (search) {
      query.question = { contains: search, mode: 'insensitive' }
    }
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      query.difficulty = difficulty
    }

    if (multipleOnly) {
      query.AND = query.AND || []
      query.AND.push({
        OR: [
          { allowMultiple: true },
          { correctAnswers: { hasSome: [0, 1, 2, 3] } },
        ],
      })
    }

    if (hasImageOnly) {
      query.AND = query.AND || []
      query.AND.push({ imageUrl: { not: null } })
      query.AND.push({ imageUrl: { not: '' } })
    }

    const excludeReported = !reportedOnly && !includeReported
    let reportedIds: string[] = []
    if (reportedOnly || excludeReported) {
      const reports = await prisma.questionReport.findMany({
        where: { status: { not: 'resolved' } },
        select: { questionId: true },
      })
      reportedIds = Array.from(new Set(reports.map((r) => r.questionId).filter(Boolean)))
    }

    if (reportedOnly) {
      if (reportedIds.length === 0) {
        return NextResponse.json(
          {
            message: 'Questions retrieved successfully',
            count: 0,
            total: 0,
            page: 1,
            pageSize: limitValue ? limitValue : 0,
            questions: [],
          },
          { status: 200 }
        )
      }
      query.AND = query.AND || []
      query.AND.push({ id: { in: reportedIds } })
    } else if (excludeReported && reportedIds.length > 0) {
      query.AND = query.AND || []
      query.AND.push({ id: { notIn: reportedIds } })
    }

    if (fullBook && resolvedSubjectCode && !normalizedChapter) {
      const subjectDoc = resolvedSubjectDoc || await prisma.subject.findUnique({ where: { code: resolvedSubjectCode } })
      const chapters = Array.isArray(subjectDoc?.chapters) ? subjectDoc?.chapters : []
      const chapterCodes = chapters.map((ch: any) => ch.code)

      if (chapters.length > 0) {
        const counts = await prisma.question.groupBy({
          by: ['chapter'],
          where: {
            subject: resolvedSubjectCode,
            chapter: { in: chapterCodes },
            ...(excludeReported && reportedIds.length > 0 ? { id: { notIn: reportedIds } } : {}),
          },
          _count: { _all: true },
        })

        const countMap = new Map<string, number>()
        counts.forEach((row: any) => {
          countMap.set(row.chapter || '', row._count?._all || 0)
        })

        const availableChapters = chapters
          .map((ch: any) => ({
            code: ch.code,
            weight: typeof ch.weightage === 'number' && ch.weightage > 0 ? ch.weightage : 1,
            available: countMap.get(ch.code) || 0,
          }))
          .filter((ch: any) => ch.available > 0)

        const targetTotal = limitValue || 50
        const weightSum = availableChapters.reduce((sum: number, ch: any) => sum + ch.weight, 0)

        if (availableChapters.length > 0 && weightSum > 0) {
          const allocations = availableChapters.map((ch: any) => {
            const raw = (ch.weight / weightSum) * targetTotal
            return {
              ...ch,
              base: Math.floor(raw),
              remainder: raw - Math.floor(raw),
            }
          })

          let remaining = targetTotal
          const pickCounts = new Map<string, number>()

          allocations.forEach((ch: any) => {
            const alloc = Math.min(ch.base, ch.available)
            pickCounts.set(ch.code, alloc)
            remaining -= alloc
          })

          const byRemainder = allocations
            .slice()
            .sort((a: any, b: any) => b.remainder - a.remainder)

          while (remaining > 0) {
            let progress = false
            for (const ch of byRemainder) {
              if (remaining <= 0) break
              const current = pickCounts.get(ch.code) || 0
              if (current < ch.available) {
                pickCounts.set(ch.code, current + 1)
                remaining -= 1
                progress = true
              }
            }
            if (!progress) break
          }

          const extraChapters = allocations
            .slice()
            .sort((a: any, b: any) => (b.available - (pickCounts.get(b.code) || 0)) - (a.available - (pickCounts.get(a.code) || 0)))

          while (remaining > 0) {
            let progress = false
            for (const ch of extraChapters) {
              if (remaining <= 0) break
              const current = pickCounts.get(ch.code) || 0
              if (current < ch.available) {
                pickCounts.set(ch.code, current + 1)
                remaining -= 1
                progress = true
              }
            }
            if (!progress) break
          }

          const samplePromises = Array.from(pickCounts.entries()).map(async ([code, count]) => {
            if (count <= 0) return []
            const items = await prisma.question.findMany({
              where: {
                subject: resolvedSubjectCode,
                chapter: code,
                ...(excludeReported && reportedIds.length > 0 ? { id: { notIn: reportedIds } } : {}),
              },
            })
            return sampleArray(items, count)
          })

          const sampled = await Promise.all(samplePromises)
          let questions = sampled.flat()

          if (shuffle && questions.length > 1) {
            questions = questions.sort(() => Math.random() - 0.5)
          }

          return NextResponse.json(
            {
              message: 'Questions retrieved successfully',
              count: questions.length,
              total: questions.length,
              page: 1,
              pageSize: questions.length,
              questions,
            },
            { status: 200 }
          )
        }
      }
    }

    const total = await prisma.question.count({ where: query })
    let questions = await prisma.question.findMany({
      where: query,
      orderBy: newlyAdded ? { createdAt: 'desc' } : { questionNumber: 'asc' },
      skip: limitValue && !Number.isNaN(limitValue) ? (pageValue - 1) * limitValue : undefined,
      take: limitValue && !Number.isNaN(limitValue) ? limitValue : undefined,
    })

    if (shuffle && questions.length > 1) {
      questions = questions.sort(() => Math.random() - 0.5)
    }

    return NextResponse.json(
      {
        message: 'Questions retrieved successfully',
        count: questions.length,
        total,
        page: limitValue ? pageValue : 1,
        pageSize: limitValue || total,
        questions,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Questions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const question = await prisma.question.create({ data: body })

    return NextResponse.json(
      {
        message: 'Question created successfully',
        question,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Question creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

