import type { PrismaClient } from '@prisma/client'
import { invalidateUserRecommendationCache } from '@/lib/study-recommendations'
import { updateUserPracticeStreak } from '@/lib/practice-streak'
import {
  BAE_VOL1_CODES,
  BAE_VOL1_NAME,
  BAE_VOL2_CODE,
  BAE_VOL2_NAME,
  isVol1SubjectCode,
  resolveBaeDistributionWithAvailability,
  sampleWeightedQuestionsByChapter,
  shuffleArray,
  type BaeVolume,
} from '@/lib/bae-mock'
import {
  calculateMockTimeAllowedMinutes,
  clampMockQuestionCount,
  type MockTestDefinition,
  type MockTestType,
} from '@/lib/mock-tests'
import {
  buildChapterLabelMap,
  resolveChapterLabel,
} from '@/lib/chapter-labels'

export type MockSessionQuestionRef = {
  questionId: string
  subjectCode: string
  chapterCode: string | null
  volume?: BaeVolume
}

export type MockSessionAnswer = {
  index: number
  questionId: string
  subjectCode: string
  chapterCode: string | null
  selectedAnswer: number[]
  isCorrect: boolean
  attempted: boolean
}

type ParsedQuestionSet = MockSessionQuestionRef[]

export function parseMockQuestionSet(value: unknown): ParsedQuestionSet {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const questionId = String(row.questionId || '').trim()
      if (!questionId) return null
      const subjectCode = String(row.subjectCode || row.subject || '').trim().toUpperCase()
      const chapterCode = String(row.chapterCode || row.chapter || '').trim() || null
      const volumeRaw = String(row.volume || '').toUpperCase()
      const volume = volumeRaw === 'VOL1' || volumeRaw === 'VOL2' ? (volumeRaw as BaeVolume) : undefined
      return {
        questionId,
        subjectCode,
        chapterCode,
        ...(volume ? { volume } : {}),
      }
    })
    .filter(Boolean) as ParsedQuestionSet
}

function normalizeSelectedAnswer(value: unknown) {
  const selected = Array.isArray(value) ? value : typeof value === 'number' ? [value] : []
  const normalized = selected
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 20)
  return Array.from(new Set(normalized)).sort((a, b) => a - b)
}

function isAnswerCorrect(
  question: { correctAnswer: number | null; correctAnswers: number[] },
  selected: number[]
) {
  const answerKey =
    Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
      ? question.correctAnswers.slice().sort((a, b) => a - b)
      : typeof question.correctAnswer === 'number'
        ? [question.correctAnswer]
        : []
  if (!answerKey.length) return false
  if (answerKey.length !== selected.length) return false
  return answerKey.every((entry, index) => selected[index] === entry)
}

function pickChapterWeightedQuestionIds(
  questions: Array<{ id: string; chapter: string | null }>,
  requestedCount: number,
  chapterSources: Array<unknown>
) {
  return sampleWeightedQuestionsByChapter(questions, requestedCount, chapterSources)
}

function getVolumeForSubjectCode(subjectCode: string): BaeVolume {
  return isVol1SubjectCode(subjectCode) ? 'VOL1' : 'VOL2'
}

export async function getMockConfig(
  prisma: PrismaClient,
  definition: MockTestDefinition
) {
  const counts = await Promise.all(
    definition.questionSourceCodes.map(async (code) => ({
      code,
      count: await prisma.question.count({ where: { subject: code } }),
    }))
  )
  const byCode = new Map(counts.map((row) => [row.code, row.count]))

  const totalAvailable = counts.reduce((sum, row) => sum + row.count, 0)
  const canStart = definition.isCombined
    ? BAE_VOL1_CODES.some((code) => (byCode.get(code) || 0) > 0) &&
      (byCode.get(BAE_VOL2_CODE) || 0) > 0
    : (byCode.get(definition.subjects[0].code) || 0) > 0

  const defaultQuestions = definition.defaultQuestions
  const timeAllowedMinutes = calculateMockTimeAllowedMinutes(
    defaultQuestions,
    definition.timerPerQuestionSeconds
  )

  const qafbComingSoon =
    definition.testType === 'qafb_mock' &&
    (byCode.get(definition.subjects[0].code) || 0) <= 0

  let errorMessage: string | null = null
  if (!canStart) {
    if (qafbComingSoon && definition.comingSoonMessage) {
      errorMessage = definition.comingSoonMessage.description
    } else if (definition.isCombined) {
      const vol1Available = BAE_VOL1_CODES.reduce((sum, code) => sum + (byCode.get(code) || 0), 0)
      errorMessage =
        vol1Available <= 0
          ? `${definition.subjects[0].code} has no questions yet.`
          : `${definition.subjects[1].code} has no questions yet.`
    } else {
      errorMessage = `${definition.subjects[0].code} has no questions yet.`
    }
  }

  return {
    success: true,
    canStart,
    comingSoon: qafbComingSoon,
    availability: {
      total: totalAvailable,
      bySubject: definition.subjects.map((subject) => ({
        code: subject.code,
        count:
          subject.code === definition.subjects[0].code && definition.isCombined
            ? BAE_VOL1_CODES.reduce((sum, code) => sum + (byCode.get(code) || 0), 0)
            : byCode.get(subject.code) || 0,
      })),
      ...(definition.isCombined
        ? {
            vol1: BAE_VOL1_CODES.reduce((sum, code) => sum + (byCode.get(code) || 0), 0),
            vol2: byCode.get(BAE_VOL2_CODE) || 0,
          }
        : {}),
    },
    defaults: {
      totalQuestions: defaultQuestions,
      timeAllowedMinutes,
    },
    errorMessage,
  }
}

export async function startMockSession(
  prisma: PrismaClient,
  userId: string,
  definition: MockTestDefinition,
  requestedQuestions: number
) {
  const totalRequested = clampMockQuestionCount(definition, requestedQuestions)

  if (definition.isCombined) {
    const [vol1Questions, vol2Questions, vol1Subjects, vol2Subject] = await Promise.all([
      prisma.question.findMany({
        where: { subject: { in: [...BAE_VOL1_CODES] } },
        select: { id: true, chapter: true, subject: true },
      }),
      prisma.question.findMany({
        where: { subject: BAE_VOL2_CODE },
        select: { id: true, chapter: true, subject: true },
      }),
      prisma.subject.findMany({
        where: { code: { in: [...BAE_VOL1_CODES] } },
        select: { chapters: true },
      }),
      prisma.subject.findUnique({
        where: { code: BAE_VOL2_CODE },
        select: { chapters: true },
      }),
    ])

    const distribution = resolveBaeDistributionWithAvailability(
      totalRequested,
      vol1Questions.length,
      vol2Questions.length
    )

    if (distribution.totalQuestions < 2) {
      throw new Error('Not enough questions available to generate a meaningful BAE mock test.')
    }

    const vol1Selected = pickChapterWeightedQuestionIds(
      vol1Questions,
      distribution.vol1Count,
      vol1Subjects.map((subject) => subject.chapters)
    )
    const vol2Selected = pickChapterWeightedQuestionIds(vol2Questions, distribution.vol2Count, [
      vol2Subject?.chapters,
    ])

    const vol1Map = new Map(vol1Questions.map((row) => [row.id, row]))
    const vol2Map = new Map(vol2Questions.map((row) => [row.id, row]))

    const questionSet = shuffleArray<MockSessionQuestionRef>([
      ...vol1Selected.map((questionId) => {
        const question = vol1Map.get(questionId)
        return {
          questionId,
          subjectCode: String(question?.subject || definition.subjects[0].code).toUpperCase(),
          chapterCode: question?.chapter || null,
          volume: 'VOL1' as const,
        }
      }),
      ...vol2Selected.map((questionId) => {
        const question = vol2Map.get(questionId)
        return {
          questionId,
          subjectCode: String(question?.subject || definition.subjects[1].code).toUpperCase(),
          chapterCode: question?.chapter || null,
          volume: 'VOL2' as const,
        }
      }),
    ])

    const timeAllowedMinutes = calculateMockTimeAllowedMinutes(
      distribution.totalQuestions,
      definition.timerPerQuestionSeconds
    )

    const session = await prisma.baeMockSession.create({
      data: {
        userId,
        testType: definition.testType,
        subjectIds: definition.subjects.map((subject) => subject.code),
        totalQuestions: distribution.totalQuestions,
        timeAllowed: timeAllowedMinutes,
        vol1Count: distribution.vol1Count,
        vol2Count: distribution.vol2Count,
        questionSet,
      },
      select: { id: true },
    })

    return {
      sessionId: session.id,
      totalQuestions: distribution.totalQuestions,
      timeAllowedMinutes,
      warning: distribution.warning || null,
    }
  }

  const subjectCode = definition.subjects[0].code
  const [questions, subjectDoc] = await Promise.all([
    prisma.question.findMany({
      where: { subject: subjectCode },
      select: { id: true, chapter: true, subject: true },
    }),
    prisma.subject.findUnique({
      where: { code: subjectCode },
      select: { chapters: true },
    }),
  ])

  if (questions.length <= 0) {
    throw new Error(`${subjectCode} has no questions yet.`)
  }

  let finalTotal = totalRequested
  let warning: string | null = null
  if (questions.length < finalTotal) {
    finalTotal = questions.length
    warning = `Test contains ${finalTotal} questions (maximum available in ${subjectCode}).`
  }

  const pickedIds = pickChapterWeightedQuestionIds(questions, finalTotal, [subjectDoc?.chapters])
  const questionMap = new Map(questions.map((row) => [row.id, row]))
  const questionSet = shuffleArray<MockSessionQuestionRef>(
    pickedIds.map((questionId) => {
      const question = questionMap.get(questionId)
      return {
        questionId,
        subjectCode: String(question?.subject || subjectCode).toUpperCase(),
        chapterCode: question?.chapter || null,
      }
    })
  )

  const timeAllowedMinutes = calculateMockTimeAllowedMinutes(
    finalTotal,
    definition.timerPerQuestionSeconds
  )

  const session = await prisma.baeMockSession.create({
    data: {
      userId,
      testType: definition.testType,
      subjectIds: [subjectCode],
      totalQuestions: finalTotal,
      timeAllowed: timeAllowedMinutes,
      vol1Count: 0,
      vol2Count: 0,
      questionSet,
    },
    select: { id: true },
  })

  return {
    sessionId: session.id,
    totalQuestions: finalTotal,
    timeAllowedMinutes,
    warning,
  }
}

export async function getMockSessionPayload(
  prisma: PrismaClient,
  userId: string,
  sessionId: string
) {
  const session = await prisma.baeMockSession.findFirst({
    where: { id: sessionId, userId },
  })
  if (!session) {
    return null
  }

  const questionSet = parseMockQuestionSet(session.questionSet)
  const questionIds = questionSet.map((item) => item.questionId)
  const dbQuestions = questionIds.length
    ? await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true,
          subject: true,
          chapter: true,
          questionNumber: true,
          question: true,
          imageUrl: true,
          options: true,
          optionImageUrls: true,
          explanation: true,
          difficulty: true,
          allowMultiple: true,
          maxSelections: true,
        },
      })
    : []

  const questionMap = new Map(dbQuestions.map((question) => [question.id, question]))
  const subjectCodes = Array.from(
    new Set(
      dbQuestions
        .map((question) => String(question.subject || '').trim().toUpperCase())
        .filter(Boolean)
    )
  )
  const subjectRows = subjectCodes.length
    ? await prisma.subject.findMany({
        where: { code: { in: subjectCodes } },
        select: { chapters: true },
      })
    : []
  const chapterLabels: Record<string, string> = {}
  for (const row of subjectRows) {
    const map = buildChapterLabelMap(row.chapters)
    for (const [key, label] of Object.entries(map)) {
      if (!chapterLabels[key]) chapterLabels[key] = label
    }
  }

  const questions = questionSet
    .map((item, index) => {
      const question = questionMap.get(item.questionId)
      if (!question) return null
      const subjectCode = String(item.subjectCode || question.subject || '').toUpperCase()
      const volume =
        item.volume ||
        (session.testType === 'bae_mock'
          ? getVolumeForSubjectCode(subjectCode)
          : undefined)
      const tagLabel =
        volume === 'VOL1'
          ? BAE_VOL1_NAME
          : volume === 'VOL2'
            ? BAE_VOL2_NAME
            : subjectCode
      return {
        index,
        id: question.id,
        subject: subjectCode,
        chapter: question.chapter,
        questionNumber: question.questionNumber,
        question: question.question,
        imageUrl: question.imageUrl,
        options: question.options,
        optionImageUrls: question.optionImageUrls,
        explanation: question.explanation,
        difficulty: question.difficulty,
        allowMultiple: question.allowMultiple,
        maxSelections: question.maxSelections,
        volume: volume || null,
        volumeLabel: tagLabel,
        chapterLabel: resolveChapterLabel(question.chapter, chapterLabels),
      }
    })
    .filter(Boolean)

  const storedAnswers = Array.isArray(session.answers) ? (session.answers as any[]) : []
  const answersByIndex = new Map<number, number[]>()
  for (const answer of storedAnswers) {
    const index = Number(answer?.index)
    if (!Number.isInteger(index)) continue
    answersByIndex.set(index, normalizeSelectedAnswer(answer?.selectedAnswer))
  }

  return {
    session,
    questions,
    answers: questions.map((question) => answersByIndex.get((question as any).index) || []),
    chapterLabels,
  }
}

function roundPercent(correct: number, attempted: number) {
  if (!attempted) return 0
  return Math.round((correct / attempted) * 100)
}

export async function submitMockSession(
  prisma: PrismaClient,
  userId: string,
  sessionId: string,
  payload: {
    answers?: unknown[]
    timeTakenSeconds?: number
  }
) {
  const session = await prisma.baeMockSession.findFirst({
    where: { id: sessionId, userId },
  })

  if (!session) {
    throw new Error('Session not found')
  }

  if (session.completed) {
    return {
      alreadyCompleted: true,
      summary: session,
    }
  }

  const questionSet = parseMockQuestionSet(session.questionSet)
  const questionIds = questionSet.map((item) => item.questionId)
  const questionRecords = questionIds.length
    ? await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true,
          subject: true,
          chapter: true,
          correctAnswer: true,
          correctAnswers: true,
        },
      })
    : []
  const questionMap = new Map(questionRecords.map((question) => [question.id, question]))

  let correctAnswers = 0
  let wrongAnswers = 0
  let notAttempted = 0
  let vol1Correct = 0
  let vol2Correct = 0
  const chapterMap = new Map<string, { attempted: number; correct: number }>()
  const incomingAnswers = Array.isArray(payload.answers) ? payload.answers : []

  const storedAnswers: MockSessionAnswer[] = questionSet.map((item, index) => {
    const selected = normalizeSelectedAnswer(incomingAnswers[index])
    const question = questionMap.get(item.questionId)
    const subjectCode = String(item.subjectCode || question?.subject || '').toUpperCase()
    const chapterCode = String(item.chapterCode || question?.chapter || '').trim() || null
    const attempted = selected.length > 0
    const volume =
      item.volume ||
      (session.testType === 'bae_mock' ? getVolumeForSubjectCode(subjectCode) : undefined)

    if (!question || !attempted) {
      if (!attempted) notAttempted += 1
      return {
        index,
        questionId: item.questionId,
        subjectCode,
        chapterCode,
        selectedAnswer: selected,
        isCorrect: false,
        attempted,
      }
    }

    const correct = isAnswerCorrect(question, selected)
    if (correct) {
      correctAnswers += 1
      if (volume === 'VOL1') vol1Correct += 1
      if (volume === 'VOL2') vol2Correct += 1
    } else {
      wrongAnswers += 1
    }

    const chapterKey = chapterCode || 'UNMAPPED'
    const chapterStats = chapterMap.get(chapterKey) || { attempted: 0, correct: 0 }
    chapterStats.attempted += 1
    if (correct) chapterStats.correct += 1
    chapterMap.set(chapterKey, chapterStats)

    return {
      index,
      questionId: item.questionId,
      subjectCode,
      chapterCode,
      selectedAnswer: selected,
      isCorrect: correct,
      attempted: true,
    }
  })

  const chapterBreakdown = Array.from(chapterMap.entries()).reduce(
    (acc, [chapterCode, stats]) => ({
      ...acc,
      [chapterCode]: {
        attempted: stats.attempted,
        correct: stats.correct,
        accuracy: roundPercent(stats.correct, stats.attempted),
      },
    }),
    {} as Record<string, { attempted: number; correct: number; accuracy: number }>
  )

  const safeTotal = questionSet.length
  const scorePercent = safeTotal > 0 ? Math.round((correctAnswers / safeTotal) * 100) : 0
  const rawTimeTaken = Number(payload.timeTakenSeconds) || 0
  const timeTaken = Math.max(0, Math.min(Math.floor(rawTimeTaken), session.timeAllowed * 60))

  const completedSession = await prisma.baeMockSession.update({
    where: { id: session.id },
    data: {
      completed: true,
      status: 'completed',
      completedAt: new Date(),
      timeTaken,
      correctAnswers,
      wrongAnswers,
      notAttempted,
      scorePercent,
      vol1Correct: session.testType === 'bae_mock' ? vol1Correct : 0,
      vol2Correct: session.testType === 'bae_mock' ? vol2Correct : 0,
      chapterBreakdown,
      answers: storedAnswers,
    },
  })

  if (completedSession.totalQuestions > 0) {
    void updateUserPracticeStreak(prisma, userId, new Date(), {
      endpoint: `/api/mock-tests/session/submit/${completedSession.testType}`,
    }).catch((error: any) => {
      console.error('mock session streak update failed:', error)
    })
    void invalidateUserRecommendationCache(prisma, userId).catch((error: any) => {
      console.error('mock session recommendation cache invalidation failed:', error)
    })
  }

  return {
    alreadyCompleted: false,
    summary: completedSession,
  }
}

function parseChapterBreakdown(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as Record<string, { attempted?: unknown; correct?: unknown; accuracy?: unknown }>
}

export async function buildSingleMockWeakAreaAnalysis(
  prisma: PrismaClient,
  userId: string,
  testType: Extract<MockTestType, 'foa_mock' | 'qafb_mock'>
) {
  const subjectCode = testType === 'foa_mock' ? 'FOA' : 'QAFB'
  const [sessions, subjectDoc] = await Promise.all([
    prisma.baeMockSession.findMany({
      where: {
        userId,
        testType,
        completed: true,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        totalQuestions: true,
        correctAnswers: true,
        scorePercent: true,
        timeAllowed: true,
        timeTaken: true,
        chapterBreakdown: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.subject.findUnique({
      where: { code: subjectCode },
      select: { chapters: true },
    }),
  ])
  const chapterLabels = buildChapterLabelMap(subjectDoc?.chapters)

  const attemptCount = sessions.length
  const remainingForUnlock = Math.max(0, 3 - attemptCount)

  const chapterTotals = new Map<string, { attempted: number; correct: number }>()
  for (const session of sessions) {
    const chapterBreakdown = parseChapterBreakdown(session.chapterBreakdown)
    for (const [chapterCode, stats] of Object.entries(chapterBreakdown)) {
      const attempted = Math.max(0, Number(stats?.attempted) || 0)
      const correct = Math.max(0, Number(stats?.correct) || 0)
      const current = chapterTotals.get(chapterCode) || { attempted: 0, correct: 0 }
      current.attempted += attempted
      current.correct += correct
      chapterTotals.set(chapterCode, current)
    }
  }

  const chapters = Array.from(chapterTotals.entries())
    .map(([chapterCode, totals]) => ({
      chapterCode,
      chapterLabel: resolveChapterLabel(chapterCode, chapterLabels),
      attempted: totals.attempted,
      correct: totals.correct,
      accuracy: roundPercent(totals.correct, totals.attempted),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)

  const history = sessions
    .slice(-10)
    .reverse()
    .map((session, index, rows) => {
      const previous = rows[index + 1]
      const delta = previous ? session.scorePercent - previous.scorePercent : 0
      const chapterBreakdown = parseChapterBreakdown(session.chapterBreakdown)
      const weakestChapter = Object.entries(chapterBreakdown)
        .map(([chapterCode, stats]) => ({
          chapterCode,
          accuracy: Math.max(0, Number(stats?.accuracy) || 0),
        }))
        .sort((a, b) => a.accuracy - b.accuracy)[0]
      return {
        id: session.id,
        date: session.completedAt || session.createdAt,
        scorePercent: session.scorePercent,
        scoreText: `${session.correctAnswers}/${session.totalQuestions}`,
        weakestChapter: weakestChapter?.chapterCode || null,
        weakestChapterLabel: weakestChapter
          ? resolveChapterLabel(weakestChapter.chapterCode, chapterLabels)
          : null,
        weakestAccuracy: weakestChapter?.accuracy ?? null,
        timeAllowed: session.timeAllowed,
        timeTaken: session.timeTaken || 0,
        improvementDelta: delta,
      }
    })

  return {
    success: true,
    attemptCount,
    unlocked: attemptCount >= 3,
    remainingForUnlock,
    chapters,
    history,
    chapterLabels,
  }
}
