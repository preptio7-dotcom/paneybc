export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/cache'
import { NextRequest, NextResponse } from 'next/server'

// ─── Cache TTLs ───────────────────────────────────────────────────────────────
const TTL_SUBJECTS        = 1800  // 30 min — reuse same cache as questions route
const TTL_REPORTED_IDS    = 300   // 5 min  — reuse same cache as questions route
const TTL_CHAPTER_COUNTS  = 600   // 10 min — question counts per subject chapter

// ─── Cache keys ───────────────────────────────────────────────────────────────
// IMPORTANT: these are the EXACT same keys used in questions/route.ts
// so both routes share the same cached data — one DB hit serves both
const KEY_ALL_SUBJECTS  = 'questions:subjects:all'
const KEY_REPORTED_IDS  = 'questions:reported:unresolved:ids'
const KEY_CHAPTER_COUNTS = (subjectCode: string) =>
  `subjects:chapter-counts:${subjectCode}`

export async function GET(
  request: NextRequest,
  context: { params: { code?: string } }
) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const codeParam =
      context.params?.code || pathParts[pathParts.length - 1] || ''
    const code = codeParam.trim()
    const normalized = code.replace(/\s+/g, '').toUpperCase()

    // ── Resolve subject ───────────────────────────────────────────────────────
    // FIX: was calling prisma.subject.findMany() fresh on every request
    // Now shares the same 30-min cache with questions/route.ts
    const allSubjects = await withCache(
      KEY_ALL_SUBJECTS,
      TTL_SUBJECTS,
      () => prisma.subject.findMany()
    )

    const subject = allSubjects.find(
      (item: any) =>
        item.code.replace(/\s+/g, '').toUpperCase() === normalized
    )

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // ── Resolve reported IDs ──────────────────────────────────────────────────
    // FIX: was calling prisma.questionReport.findMany() fresh on every request
    // Now shares the same 5-min cache with questions/route.ts
    const reportedIds = await withCache(
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

    // ── Chapter question counts ───────────────────────────────────────────────
    // FIX: was running a fresh groupBy query on every subject page load
    // Now cached 10 min per subject — same counts served to all users
    const chapterCounts = await withCache(
      KEY_CHAPTER_COUNTS(subject.code),
      TTL_CHAPTER_COUNTS,
      () =>
        prisma.question.groupBy({
          by: ['chapter'],
          where: {
            subject: subject.code,
            ...(reportedIds.length > 0
              ? { id: { notIn: reportedIds } }
              : {}),
          },
          _count: { _all: true },
        })
    )

    const chapterCountMap = new Map<string, number>()
    chapterCounts.forEach((row: any) => {
      chapterCountMap.set(row.chapter || '', row._count?._all || 0)
    })

    const chapters = (subject.chapters || []).map((chapter: any) => ({
      ...chapter,
      questionCount: chapterCountMap.get(chapter.code) || 0,
    }))

    return NextResponse.json({
      subject: {
        ...subject,
        chapters,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}