import { prisma } from '@/lib/prisma'

type ChapterWeightage = {
  chapterId: string
  weight: number
}

type SelectMockTestQuestionsOptions = {
  excludeQuestionIds?: string[]
}

type ChapterQuota = {
  chapterId: string
  quota: number
  weight: number
}

const UNMAPPED_CHAPTER_KEY = '__unmapped__'

function fisherYatesShuffle<T>(input: T[]) {
  const next = input.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = next[i]
    next[i] = next[j]
    next[j] = temp
  }
  return next
}

function normalizeSubjectCodes(subjectId: string | string[]) {
  const list = Array.isArray(subjectId) ? subjectId : [subjectId]
  return Array.from(
    new Set(
      list
        .map((entry) => String(entry || '').trim().toUpperCase())
        .filter(Boolean)
    )
  )
}

function normalizeChapterId(value: string) {
  const normalized = String(value || '').trim()
  return normalized || UNMAPPED_CHAPTER_KEY
}

function buildChapterQuotas(chapterWeightages: ChapterWeightage[], totalQuestions: number) {
  const safeTotal = Math.max(0, Math.floor(Number(totalQuestions) || 0))
  if (safeTotal <= 0 || chapterWeightages.length === 0) return [] as ChapterQuota[]

  const normalized = chapterWeightages.map((entry) => ({
    chapterId: normalizeChapterId(entry.chapterId),
    weight: Number.isFinite(Number(entry.weight)) && Number(entry.weight) > 0 ? Number(entry.weight) : 1,
  }))

  const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) return [] as ChapterQuota[]

  const quotas: ChapterQuota[] = normalized.map((entry) => ({
    chapterId: entry.chapterId,
    weight: entry.weight,
    quota: Math.round((entry.weight / totalWeight) * safeTotal),
  }))

  const sum = quotas.reduce((acc, entry) => acc + entry.quota, 0)
  const diff = safeTotal - sum

  if (quotas.length > 0 && diff !== 0) {
    let maxIndex = 0
    for (let i = 1; i < quotas.length; i += 1) {
      if (quotas[i].quota > quotas[maxIndex].quota) {
        maxIndex = i
      }
    }
    quotas[maxIndex].quota += diff
  }

  // Keep quotas non-negative while preserving exact total.
  let runningTotal = quotas.reduce((acc, entry) => acc + entry.quota, 0)
  if (runningTotal !== safeTotal || quotas.some((entry) => entry.quota < 0)) {
    for (const entry of quotas) {
      if (entry.quota < 0) entry.quota = 0
    }
    runningTotal = quotas.reduce((acc, entry) => acc + entry.quota, 0)

    let adjust = safeTotal - runningTotal
    if (adjust !== 0 && quotas.length > 0) {
      const byQuota = quotas
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => b.entry.quota - a.entry.quota)

      if (adjust > 0) {
        byQuota[0].entry.quota += adjust
      } else {
        let toRemove = Math.abs(adjust)
        for (const item of byQuota) {
          if (toRemove <= 0) break
          const take = Math.min(item.entry.quota, toRemove)
          item.entry.quota -= take
          toRemove -= take
        }
      }
    }
  }

  return quotas
}

function buildChapterWhere(chapterId: string) {
  if (chapterId === UNMAPPED_CHAPTER_KEY) {
    return {
      OR: [{ chapter: null }, { chapter: '' }],
    }
  }

  return { chapter: chapterId }
}

async function resolveFallbackChapterWeights(subjectCodes: string[]) {
  const grouped = await prisma.question.groupBy({
    by: ['chapter'],
    where: { subject: { in: subjectCodes } },
    _count: { _all: true },
  })

  return grouped
    .map((row) => ({
      chapterId: row.chapter ? String(row.chapter).trim() : UNMAPPED_CHAPTER_KEY,
      weight: 1,
    }))
    .filter((row) => Boolean(row.chapterId))
}

export async function selectMockTestQuestions(
  userId: string,
  subjectId: string | string[],
  totalQuestions: number,
  chapterWeightages: Array<{ chapterId: string; weight: number }>,
  options?: SelectMockTestQuestionsOptions
): Promise<string[]> {
  const subjectCodes = normalizeSubjectCodes(subjectId)
  if (!subjectCodes.length) return []

  const safeTotal = Math.max(0, Math.floor(Number(totalQuestions) || 0))
  if (safeTotal <= 0) return []

  const normalizedWeights = chapterWeightages
    .map((entry) => ({
      chapterId: normalizeChapterId(entry.chapterId),
      weight: Number.isFinite(Number(entry.weight)) && Number(entry.weight) > 0 ? Number(entry.weight) : 1,
    }))
    .filter((entry) => Boolean(entry.chapterId))

  const effectiveWeights = normalizedWeights.length
    ? normalizedWeights
    : await resolveFallbackChapterWeights(subjectCodes)

  const chapterQuotas = buildChapterQuotas(effectiveWeights, safeTotal)
  if (!chapterQuotas.length) return []

  const historyRows = await prisma.mockTestQuestionHistory.findMany({
    where: {
      userId,
      answeredCorrectly: true,
      question: {
        subject: { in: subjectCodes },
      },
    },
    select: {
      questionId: true,
      seenAt: true,
    },
  })

  const correctlyAnsweredMap = new Map<string, Date>()
  for (const row of historyRows) {
    const existing = correctlyAnsweredMap.get(row.questionId)
    if (!existing || row.seenAt.getTime() < existing.getTime()) {
      correctlyAnsweredMap.set(row.questionId, row.seenAt)
    }
  }

  const blockedIds = new Set(
    (options?.excludeQuestionIds || []).map((id) => String(id || '').trim()).filter(Boolean)
  )
  const selectedIds = new Set<string>()

  for (const chapterEntry of chapterQuotas) {
    if (chapterEntry.quota <= 0) continue

    const combinedBlocked = Array.from(blockedIds)
    const chapterWhere = buildChapterWhere(chapterEntry.chapterId)

    const chapterQuestions = await prisma.question.findMany({
      where: {
        subject: { in: subjectCodes },
        ...(combinedBlocked.length ? { id: { notIn: combinedBlocked } } : {}),
        ...chapterWhere,
      },
      select: { id: true },
    })

    const poolFresh: string[] = []
    const poolRecycled: Array<{ id: string; seenAt: Date }> = []

    for (const question of chapterQuestions) {
      const seenAt = correctlyAnsweredMap.get(question.id)
      if (seenAt) {
        poolRecycled.push({ id: question.id, seenAt })
      } else {
        poolFresh.push(question.id)
      }
    }

    const shuffledFresh = fisherYatesShuffle(poolFresh)
    const sortedRecycled = poolRecycled.sort((a, b) => a.seenAt.getTime() - b.seenAt.getTime())

    let selectedForChapter = 0

    while (selectedForChapter < chapterEntry.quota && shuffledFresh.length > 0) {
      const nextId = shuffledFresh.shift() as string
      if (blockedIds.has(nextId)) continue
      blockedIds.add(nextId)
      selectedIds.add(nextId)
      selectedForChapter += 1
    }

    while (selectedForChapter < chapterEntry.quota && sortedRecycled.length > 0) {
      const next = sortedRecycled.shift() as { id: string; seenAt: Date }
      if (blockedIds.has(next.id)) continue
      blockedIds.add(next.id)
      selectedIds.add(next.id)
      selectedForChapter += 1
    }
  }

  return fisherYatesShuffle(Array.from(selectedIds))
}
