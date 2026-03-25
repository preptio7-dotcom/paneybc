export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { withCache, invalidateCache } from '@/lib/cache'
import { NextRequest, NextResponse } from 'next/server'

// ─── Cache TTLs ───────────────────────────────────────────────────────────────
const TTL_SUBJECTS       = 1800  // 30 min  — subjects almost never change
const TTL_REPORTED_IDS   = 300   // 5 min   — reports trickle in slowly
const TTL_CHAPTER_POOL   = 600   // 10 min  — question pool per chapter
const TTL_QUESTION_PAGE  = 600   // 10 min  — paginated non-shuffle results

// ─── Cache key builders ───────────────────────────────────────────────────────
const KEY_ALL_SUBJECTS   = 'questions:subjects:all'
const KEY_REPORTED_IDS   = 'questions:reported:unresolved:ids'
const KEY_CHAPTER_POOL   = (subject: string, chapter: string) =>
  `questions:pool:${subject}:${chapter}`
const KEY_QUESTION_PAGE  = (subject: string, chapter: string, page: number, limit: number, difficulty: string) =>
  `questions:page:${subject}:${chapter}:${page}:${limit}:${difficulty}`

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sampleArray = <T>(items: T[], count: number): T[] => {
  if (count >= items.length) return items
  const shuffled = items.slice().sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Fetch all subjects with caching — was being called fresh on EVERY request
async function getAllSubjectsCached() {
  return withCache(
    KEY_ALL_SUBJECTS,
    TTL_SUBJECTS,
    () => prisma.subject.findMany()
  )
}

// Fetch unresolved report IDs with caching — was being called fresh on EVERY request
async function getReportedIdsCached(): Promise<string[]> {
  return withCache(
    KEY_REPORTED_IDS,
    TTL_REPORTED_IDS,
    async () => {
      const reports = await prisma.questionReport.findMany({
        where: { status: { not: 'resolved' } },
        select: { questionId: true },
      })
      return Array.from(
        new Set(reports.map((r) => r.questionId).filter(Boolean))
      ) as string[]
    }
  )
}

// Fetch ALL questions for a chapter with caching
// Used by fullBook mode — eliminates N+1 per chapter
async function getChapterPoolCached(
  subject: string,
  chapter: string,
  excludeIds: string[]
) {
  // Only cache when there are no excluded IDs (clean pool)
  // When reportedIds exist, we still cache the full pool and filter in-memory
  const fullPool = await withCache(
    KEY_CHAPTER_POOL(subject, chapter),
    TTL_CHAPTER_POOL,
    () => prisma.question.findMany({
      where: { subject, chapter },
    })
  )

  // Filter out reported questions in-memory (no extra DB call)
  if (excludeIds.length > 0) {
    const excludeSet = new Set(excludeIds)
    return fullPool.filter((q: any) => !excludeSet.has(q.id))
  }

  return fullPool
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject        = searchParams.get('subject')
    const chapter        = searchParams.get('chapter')
    const limitParam     = searchParams.get('limit') || '40'
    const pageParam      = searchParams.get('page') || '1'
    const search         = (searchParams.get('search') || '').trim()
    const shuffle        = searchParams.get('shuffle') === '1'
    const fullBook       = searchParams.get('fullbook') === '1'
    const difficulty     = (searchParams.get('difficulty') || '').trim().toLowerCase()
    const reportedOnly   = searchParams.get('reported') === '1'
    const includeReported= searchParams.get('includeReported') === '1'
    const multipleOnly   = searchParams.get('multiple') === '1'
    const hasImageOnly   = searchParams.get('hasImage') === '1'
    const newlyAdded     = searchParams.get('new') === '1'
    const limitValue     = limitParam === 'all' ? null : parseInt(limitParam, 10)
    const pageValue      = Math.max(parseInt(pageParam, 10) || 1, 1)

    const normalizedSubject = subject?.trim() ? subject.trim().toUpperCase() : null
    const normalizedChapter = chapter?.trim() ? chapter.trim() : null

    // ── Resolve subject code ──────────────────────────────────────────────────
    // FIX: was calling prisma.subject.findMany() fresh on every request
    // Now uses 30-minute cache — same data served to all users
    let resolvedSubjectCode = normalizedSubject
    let resolvedSubjectDoc: any = null
    if (normalizedSubject) {
      const allSubjects = await getAllSubjectsCached()
      resolvedSubjectDoc = allSubjects.find(
        (item: any) => item.code.replace(/\s+/g, '').toUpperCase() === normalizedSubject
      )
      if (resolvedSubjectDoc?.code) {
        resolvedSubjectCode = resolvedSubjectDoc.code
      }
    }

    // ── Resolve reported IDs ──────────────────────────────────────────────────
    // FIX: was calling prisma.questionReport.findMany() fresh on every request
    // Now uses 5-minute cache
    const excludeReported = !reportedOnly && !includeReported
    let reportedIds: string[] = []
    if (reportedOnly || excludeReported) {
      reportedIds = await getReportedIdsCached()
    }

    // ── Build query ───────────────────────────────────────────────────────────
    let query: any = {}
    if (resolvedSubjectCode) query.subject = resolvedSubjectCode
    if (normalizedChapter) {
      query.chapter = { equals: normalizedChapter, mode: 'insensitive' }
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
    if (reportedOnly) {
      if (reportedIds.length === 0) {
        return NextResponse.json({
          message: 'Questions retrieved successfully',
          count: 0, total: 0, page: 1,
          pageSize: limitValue ?? 0,
          questions: [],
        }, { status: 200 })
      }
      query.AND = query.AND || []
      query.AND.push({ id: { in: reportedIds } })
    } else if (excludeReported && reportedIds.length > 0) {
      query.AND = query.AND || []
      query.AND.push({ id: { notIn: reportedIds } })
    }

    // ── fullBook mode ─────────────────────────────────────────────────────────
    // FIX: was running one prisma.question.findMany() PER CHAPTER in a loop
    // Now uses cached chapter pools — all sampling done in-memory
    if (fullBook && resolvedSubjectCode && !normalizedChapter) {
      const subjectDoc = resolvedSubjectDoc
        || (await getAllSubjectsCached()).find((s: any) => s.code === resolvedSubjectCode)

      const chapters = Array.isArray(subjectDoc?.chapters) ? subjectDoc.chapters : []
      const chapterCodes = chapters.map((ch: any) => ch.code)

      if (chapters.length > 0) {
        // Load all chapter pools from cache in parallel — no N+1
        const chapterPools = await Promise.all(
          chapterCodes.map(async (code: string) => {
            const pool = await getChapterPoolCached(
              resolvedSubjectCode!,
              code,
              excludeReported ? reportedIds : []
            )
            return { code, pool }
          })
        )

        const countMap = new Map<string, number>()
        chapterPools.forEach(({ code, pool }) => {
          countMap.set(code, pool.length)
        })

        const poolMap = new Map<string, any[]>()
        chapterPools.forEach(({ code, pool }) => {
          poolMap.set(code, pool)
        })

        const availableChapters = chapters
          .map((ch: any) => ({
            code: ch.code,
            weight: typeof ch.weightage === 'number' && ch.weightage > 0
              ? ch.weightage : 1,
            available: countMap.get(ch.code) || 0,
          }))
          .filter((ch: any) => ch.available > 0)

        const targetTotal = limitValue || 50
        const weightSum = availableChapters.reduce(
          (sum: number, ch: any) => sum + ch.weight, 0
        )

        if (availableChapters.length > 0 && weightSum > 0) {
          const allocations = availableChapters.map((ch: any) => {
            const raw = (ch.weight / weightSum) * targetTotal
            return { ...ch, base: Math.floor(raw), remainder: raw - Math.floor(raw) }
          })

          let remaining = targetTotal
          const pickCounts = new Map<string, number>()

          allocations.forEach((ch: any) => {
            const alloc = Math.min(ch.base, ch.available)
            pickCounts.set(ch.code, alloc)
            remaining -= alloc
          })

          const byRemainder = [...allocations].sort(
            (a: any, b: any) => b.remainder - a.remainder
          )
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

          const extraChapters = [...allocations].sort(
            (a: any, b: any) =>
              (b.available - (pickCounts.get(b.code) || 0)) -
              (a.available - (pickCounts.get(a.code) || 0))
          )
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

          // FIX: sample from in-memory pools — zero DB calls here
          let questions = Array.from(pickCounts.entries()).flatMap(([code, count]) => {
            if (count <= 0) return []
            const pool = poolMap.get(code) || []
            return sampleArray(pool, count)
          })

          if (shuffle && questions.length > 1) {
            questions = questions.sort(() => Math.random() - 0.5)
          }

          return NextResponse.json({
            message: 'Questions retrieved successfully',
            count: questions.length,
            total: questions.length,
            page: 1,
            pageSize: questions.length,
            questions,
          }, { status: 200 })
        }
      }
    }

    // ── Standard paginated fetch ───────────────────────────────────────────────
    // Cache non-shuffle, non-search, non-reported standard queries
    // shuffle=1 always bypasses cache (random by design)
    // search queries bypass cache (too many combinations)
    // reportedOnly bypasses cache (admin, low traffic)
    const canCache =
      !shuffle &&
      !search &&
      !reportedOnly &&
      !multipleOnly &&
      !hasImageOnly &&
      !newlyAdded &&
      resolvedSubjectCode &&
      normalizedChapter

    if (canCache) {
      const cacheKey = KEY_QUESTION_PAGE(
        resolvedSubjectCode!,
        normalizedChapter!,
        pageValue,
        limitValue ?? 0,
        difficulty
      )

      const cached = await withCache(
        cacheKey,
        TTL_QUESTION_PAGE,
        async () => {
          const total = await prisma.question.count({ where: query })
          const questions = await prisma.question.findMany({
            where: query,
            orderBy: { questionNumber: 'asc' },
            skip: limitValue ? (pageValue - 1) * limitValue : undefined,
            take: limitValue ?? undefined,
          })
          return { total, questions }
        }
      )

      return NextResponse.json({
        message: 'Questions retrieved successfully',
        count: cached.questions.length,
        total: cached.total,
        page: limitValue ? pageValue : 1,
        pageSize: limitValue || cached.total,
        questions: cached.questions,
      }, { status: 200 })
    }

    // ── Non-cacheable path (shuffle / search / special filters) ───────────────
    const total = await prisma.question.count({ where: query })
    let questions = await prisma.question.findMany({
      where: query,
      orderBy: newlyAdded ? { createdAt: 'desc' } : { questionNumber: 'asc' },
      skip: limitValue && !Number.isNaN(limitValue)
        ? (pageValue - 1) * limitValue : undefined,
      take: limitValue && !Number.isNaN(limitValue) ? limitValue : undefined,
    })

    if (shuffle && questions.length > 1) {
      questions = questions.sort(() => Math.random() - 0.5)
    }

    return NextResponse.json({
      message: 'Questions retrieved successfully',
      count: questions.length,
      total,
      page: limitValue ? pageValue : 1,
      pageSize: limitValue || total,
      questions,
    }, { status: 200 })

  } catch (error: any) {
    console.error('Questions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const question = await prisma.question.create({ data: body })

    // New question added — clear all question-related caches
    invalidateCache('questions:pool:')
    invalidateCache('questions:page:')
    // Note: subjects cache kept — POST doesn't change subjects

    return NextResponse.json({
      message: 'Question created successfully',
      question,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Question creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}