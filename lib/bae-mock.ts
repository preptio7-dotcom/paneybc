export const BAE_VOL1_CODE = 'BAEIVII'
export const BAE_VOL1_LEGACY_CODE = 'BAEIVI'
export const BAE_VOL1_CODES = [BAE_VOL1_CODE, BAE_VOL1_LEGACY_CODE] as const
export const BAE_VOL2_CODE = 'BAEIV2E'

export const BAE_VOL1_NAME = 'Vol I - ITB'
export const BAE_VOL2_NAME = 'Vol II - ECO'

export type BaeVolume = 'VOL1' | 'VOL2'

export type BaeDistribution = {
  totalQuestions: number
  vol1Count: number
  vol2Count: number
  warning?: string
}

export type BaeSessionQuestionRef = {
  questionId: string
  volume: BaeVolume
}

export function calculateBaeTimeAllowedMinutes(totalQuestions: number) {
  const safeTotal = Math.max(1, Math.floor(Number(totalQuestions) || 1))
  return Math.ceil((safeTotal * 90) / 60)
}

export function shuffleArray<T>(input: T[]) {
  const items = input.slice()
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = items[index]
    items[index] = items[swapIndex]
    items[swapIndex] = temp
  }
  return items
}

export function generateBAEDistribution(totalQuestions: number) {
  const safeTotal = Math.max(2, Math.floor(totalQuestions))
  const maxVol1 = Math.floor(safeTotal / 2)
  const minVol1 = Math.max(1, Math.floor(safeTotal * 0.2))

  const vol1Count = Math.floor(Math.random() * (maxVol1 - minVol1 + 1)) + minVol1
  const vol2Count = safeTotal - vol1Count

  if (vol2Count < vol1Count) {
    const half = Math.floor(safeTotal / 2)
    return {
      vol1Count: half,
      vol2Count: safeTotal - half,
    }
  }

  return { vol1Count, vol2Count }
}

function pickRandomCandidate(candidates: number[]) {
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function resolveBaeDistributionWithAvailability(
  requestedTotalQuestions: number,
  availableVol1: number,
  availableVol2: number
): BaeDistribution {
  const safeRequested = Math.max(10, Math.min(100, Math.floor(requestedTotalQuestions || 50)))
  const maxAvailable = Math.max(0, Math.floor(availableVol1)) + Math.max(0, Math.floor(availableVol2))
  let totalQuestions = safeRequested
  let warning: string | undefined

  if (maxAvailable < totalQuestions) {
    totalQuestions = maxAvailable
    warning = `Test contains ${totalQuestions} questions (maximum available).`
  }

  if (totalQuestions <= 0) {
    return {
      totalQuestions: 0,
      vol1Count: 0,
      vol2Count: 0,
      warning,
    }
  }

  // Keep reducing total until a valid Vol II >= Vol I split exists with current inventory.
  while (totalQuestions > 0) {
    const minVol1Preferred = Math.max(1, Math.floor(totalQuestions * 0.2))
    const maxVol1 = Math.floor(totalQuestions / 2)

    const allCandidates: number[] = []
    const preferredCandidates: number[] = []

    for (let vol1 = 0; vol1 <= maxVol1; vol1 += 1) {
      const vol2 = totalQuestions - vol1
      if (vol1 > availableVol1) continue
      if (vol2 > availableVol2) continue
      if (vol2 < vol1) continue

      allCandidates.push(vol1)
      if (vol1 >= minVol1Preferred) {
        preferredCandidates.push(vol1)
      }
    }

    const selectedVol1 =
      pickRandomCandidate(preferredCandidates) ?? pickRandomCandidate(allCandidates)
    if (selectedVol1 !== null) {
      return {
        totalQuestions,
        vol1Count: selectedVol1,
        vol2Count: totalQuestions - selectedVol1,
        warning,
      }
    }

    totalQuestions -= 1
    if (!warning) {
      warning = `Test contains ${totalQuestions} questions (maximum available).`
    }
  }

  return {
    totalQuestions: 0,
    vol1Count: 0,
    vol2Count: 0,
    warning,
  }
}

export function getVolumeLabel(volume: BaeVolume) {
  return volume === 'VOL1' ? BAE_VOL1_NAME : BAE_VOL2_NAME
}

export function isVol1SubjectCode(subjectCode: string) {
  const normalized = String(subjectCode || '').toUpperCase()
  return BAE_VOL1_CODES.includes(normalized as (typeof BAE_VOL1_CODES)[number])
}

export function getVolumeBySubjectCode(subjectCode: string): BaeVolume {
  return isVol1SubjectCode(subjectCode) ? 'VOL1' : 'VOL2'
}

type ChapterWeightEntry = {
  code: string
  weight: number
}

type QuestionWithChapter = {
  id: string
  chapter: string | null
}

function parseChapterWeights(rawChapters: unknown): ChapterWeightEntry[] {
  if (!Array.isArray(rawChapters)) return []

  const entries: ChapterWeightEntry[] = []

  for (const row of rawChapters) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const chapter = row as Record<string, unknown>
    const code = String(chapter.code || chapter.chapter || '').trim()
    if (!code) continue
    const weight = Number(chapter.weightage)
    entries.push({
      code,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
    })
  }

  return entries
}

function buildAllocationByWeight(
  requestedCount: number,
  chapters: Array<{ code: string; available: number; weight: number }>
) {
  if (requestedCount <= 0 || chapters.length === 0) {
    return new Map<string, number>()
  }

  const safeRequested = Math.min(
    requestedCount,
    chapters.reduce((sum, chapter) => sum + chapter.available, 0)
  )
  const weightSum = chapters.reduce((sum, chapter) => sum + chapter.weight, 0)
  const allocation = new Map<string, number>()
  if (weightSum <= 0) return allocation

  const allocations = chapters.map((chapter) => {
    const raw = (chapter.weight / weightSum) * safeRequested
    return {
      ...chapter,
      base: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    }
  })

  let remaining = safeRequested
  for (const chapter of allocations) {
    const allocated = Math.min(chapter.base, chapter.available)
    allocation.set(chapter.code, allocated)
    remaining -= allocated
  }

  const byRemainder = allocations.slice().sort((a, b) => b.remainder - a.remainder)
  while (remaining > 0) {
    let progressed = false
    for (const chapter of byRemainder) {
      if (remaining <= 0) break
      const current = allocation.get(chapter.code) || 0
      if (current < chapter.available) {
        allocation.set(chapter.code, current + 1)
        remaining -= 1
        progressed = true
      }
    }
    if (!progressed) break
  }

  return allocation
}

export function sampleWeightedQuestionsByChapter(
  questions: QuestionWithChapter[],
  requestedCount: number,
  chapterSources: Array<unknown>
) {
  if (requestedCount <= 0) return [] as string[]
  if (questions.length <= requestedCount) return questions.map((question) => question.id)

  const chapterWeightMap = new Map<string, number>()
  for (const source of chapterSources) {
    const entries = parseChapterWeights(source)
    for (const entry of entries) {
      if (!chapterWeightMap.has(entry.code)) {
        chapterWeightMap.set(entry.code, entry.weight)
      }
    }
  }

  if (!chapterWeightMap.size) {
    return shuffleArray(questions.map((question) => question.id)).slice(0, requestedCount)
  }

  const groupedByChapter = new Map<string, string[]>()
  for (const question of questions) {
    const chapterCode = String(question.chapter || '').trim()
    const key = chapterCode || '__unmapped__'
    if (!groupedByChapter.has(key)) {
      groupedByChapter.set(key, [])
    }
    groupedByChapter.get(key)!.push(question.id)
  }

  const weightedChapters = Array.from(groupedByChapter.entries()).map(([code, ids]) => ({
    code,
    available: ids.length,
    weight: chapterWeightMap.get(code) || 1,
  }))

  const allocation = buildAllocationByWeight(requestedCount, weightedChapters)
  const picked: string[] = []

  for (const chapter of weightedChapters) {
    const target = allocation.get(chapter.code) || 0
    if (target <= 0) continue
    const questionIds = groupedByChapter.get(chapter.code) || []
    picked.push(...shuffleArray(questionIds).slice(0, target))
  }

  if (picked.length < requestedCount) {
    const pickedSet = new Set(picked)
    const leftovers = shuffleArray(
      questions.map((question) => question.id).filter((id) => !pickedSet.has(id))
    )
    picked.push(...leftovers.slice(0, requestedCount - picked.length))
  }

  return picked.slice(0, requestedCount)
}
