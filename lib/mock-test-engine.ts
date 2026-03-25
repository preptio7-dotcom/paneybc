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
import { selectMockTestQuestions } from '@/lib/mockTestQuestionSelector'

export type MockSessionMcqQuestionRef = {
  questionType?: 'mcq'
  questionId: string
  subjectCode: string
  chapterCode: string | null
  volume?: BaeVolume
}

export type MockSessionFinancialStatementQuestionRef = {
  questionType: 'financial_statement'
  questionId: string
  subjectCode: string
  chapterCode: string | null
  caseId: number
  caseNumber: string
  caseTitle: string
}

export type MockSessionQuestionRef =
  | MockSessionMcqQuestionRef
  | MockSessionFinancialStatementQuestionRef

type FinancialStatementLineAnswer = {
  line_item_id: number
  selected_value: string
}

type FinancialStatementAnswerPayload = {
  sociAnswers: FinancialStatementLineAnswer[]
  sofpAnswers: FinancialStatementLineAnswer[]
}

type FinancialStatementAnswerResult = {
  caseId: number
  caseNumber: string
  caseTitle: string
  totalMarksObtained: number
  totalMarks: number
  percentage: number
  attemptedLineItems: number
  totalLineItems: number
}

export type MockSessionAnswer =
  | {
      index: number
      questionId: string
      subjectCode: string
      chapterCode: string | null
      questionType?: 'mcq'
      selectedAnswer: number[]
      isCorrect: boolean
      attempted: boolean
    }
  | {
      index: number
      questionId: string
      subjectCode: string
      chapterCode: string | null
      questionType: 'financial_statement'
      selectedAnswer: number[]
      isCorrect: boolean
      attempted: boolean
      financialStatementAnswers: FinancialStatementAnswerPayload
      financialStatementResult: FinancialStatementAnswerResult | null
    }

type ParsedQuestionSet = MockSessionQuestionRef[]

function normalizeFinancialStatementLineAnswers(value: unknown): FinancialStatementLineAnswer[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const entry = row as Record<string, unknown>
      const lineItemId = Number(entry.line_item_id)
      if (!Number.isInteger(lineItemId) || lineItemId <= 0) return null
      return {
        line_item_id: lineItemId,
        selected_value: String(entry.selected_value ?? '').trim(),
      }
    })
    .filter(Boolean) as FinancialStatementLineAnswer[]
}

function normalizeFinancialStatementPayload(value: unknown): FinancialStatementAnswerPayload {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    sociAnswers: normalizeFinancialStatementLineAnswers(row.sociAnswers),
    sofpAnswers: normalizeFinancialStatementLineAnswers(row.sofpAnswers),
  }
}

function countFinancialStatementAttemptedLineItems(payload: FinancialStatementAnswerPayload) {
  return [...payload.sociAnswers, ...payload.sofpAnswers].reduce(
    (sum, item) => (String(item.selected_value || '').trim() ? sum + 1 : sum),
    0
  )
}

export function parseMockQuestionSet(value: unknown): ParsedQuestionSet {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const questionType = String(row.questionType || '').trim().toLowerCase()
      if (questionType === 'financial_statement' || Number.isInteger(Number(row.caseId))) {
        const caseId = Number(row.caseId)
        if (!Number.isInteger(caseId) || caseId <= 0) return null
        const caseNumber = String(row.caseNumber || `Case ${caseId}`).trim() || `Case ${caseId}`
        const caseTitle = String(row.caseTitle || 'Financial Statements').trim() || 'Financial Statements'
        return {
          questionType: 'financial_statement' as const,
          questionId: String(row.questionId || `fs-case-${caseId}`).trim() || `fs-case-${caseId}`,
          subjectCode: String(row.subjectCode || row.subject || 'FOA').trim().toUpperCase() || 'FOA',
          chapterCode:
            String(row.chapterCode || row.chapter || 'FINANCIAL_STATEMENTS').trim() ||
            'FINANCIAL_STATEMENTS',
          caseId,
          caseNumber,
          caseTitle,
        }
      }

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

function normalizeFinancialStatementValue(value: string) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return { raw: '', num: null as number | null }
  const raw = trimmed.toLowerCase().replace(/[\u2013\u2014\u2212]/g, '-')
  let numericCandidate = raw
    .replace(/rs\.?/g, '')
    .replace(/pkr/g, '')
    .replace(/[, ]+/g, '')
    .replace(/^\+/, '')

  let isParenNegative = false
  if (/^\(.*\)$/.test(numericCandidate)) {
    isParenNegative = true
    numericCandidate = numericCandidate.slice(1, -1)
  }

  if (numericCandidate === '' || numericCandidate === '-' || numericCandidate === '.') {
    return { raw: raw.replace(/\s+/g, ' '), num: null as number | null }
  }

  const numericPattern = /^-?\d*\.?\d+$/
  let num: number | null = null
  if (numericPattern.test(numericCandidate)) {
    const normalizedNumber =
      isParenNegative && !numericCandidate.startsWith('-')
        ? `-${numericCandidate}`
        : numericCandidate
    const parsed = Number(normalizedNumber)
    num = Number.isFinite(parsed) ? parsed : null
  }

  return { raw: raw.replace(/\s+/g, ' ').replace(/,+/g, ''), num }
}

function isFinancialStatementManualAnswerCorrect(selected: string, correct: string) {
  const a = normalizeFinancialStatementValue(selected)
  const b = normalizeFinancialStatementValue(correct)
  if (a.num !== null && b.num !== null) {
    return Math.abs(a.num - b.num) < 0.0001
  }
  return a.raw === b.raw
}

function buildFinancialStatementAnswerSet(
  lineItems: Array<{
    id: number
    heading: string
    inputType: string | null
    correctValue: string
    marks: unknown
  }>,
  answers: FinancialStatementLineAnswer[]
) {
  return lineItems.map((item) => {
    const answer = answers.find((entry) => Number(entry.line_item_id) === Number(item.id))
    const selectedValue = String(answer?.selected_value ?? '').trim()
    const mode = String(item.inputType || 'dropdown').toLowerCase()
    const isCorrect = selectedValue
      ? mode === 'manual'
        ? isFinancialStatementManualAnswerCorrect(selectedValue, item.correctValue)
        : selectedValue === item.correctValue
      : false
    const marks = Number(item.marks) || 0
    return {
      line_item_id: item.id,
      heading: item.heading,
      selected_value: selectedValue,
      correct_value: item.correctValue,
      is_correct: Boolean(isCorrect),
      marks_awarded: isCorrect ? marks : 0,
    }
  })
}

function extractChapterWeightages(chapterSource: unknown) {
  if (!Array.isArray(chapterSource)) return [] as Array<{ chapterId: string; weight: number }>
  return chapterSource
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
      const row = entry as Record<string, unknown>
      const chapterId = String(row.code || row.chapter || '').trim()
      if (!chapterId) return null
      const rawWeight = Number(row.weightage)
      return {
        chapterId,
        weight: Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 1,
      }
    })
    .filter(Boolean) as Array<{ chapterId: string; weight: number }>
}

function mergeChapterWeightages(sources: Array<unknown>) {
  const merged = new Map<string, number>()
  for (const source of sources) {
    for (const row of extractChapterWeightages(source)) {
      if (!merged.has(row.chapterId)) {
        merged.set(row.chapterId, row.weight)
      }
    }
  }
  return Array.from(merged.entries()).map(([chapterId, weight]) => ({ chapterId, weight }))
}

function getVolumeForSubjectCode(subjectCode: string): BaeVolume {
  return isVol1SubjectCode(subjectCode) ? 'VOL1' : 'VOL2'
}

export async function getMockConfig(
  prisma: PrismaClient,
  definition: MockTestDefinition
) {
  const [counts, foaFinancialStatementsCases] = await Promise.all([
    Promise.all(
      definition.questionSourceCodes.map(async (code) => ({
        code,
        count: await prisma.question.count({ where: { subject: code } }),
      }))
    ),
    definition.testType === 'foa_mock'
      ? prisma.financialStatementCase.count({ where: { isActive: true } })
      : Promise.resolve(0),
  ])
  const byCode = new Map(counts.map((row) => [row.code, row.count]))

  const totalAvailable = counts.reduce((sum, row) => sum + row.count, 0)
  const canStart = definition.isCombined
    ? BAE_VOL1_CODES.some((code) => (byCode.get(code) || 0) > 0) &&
      (byCode.get(BAE_VOL2_CODE) || 0) > 0
    : (byCode.get(definition.subjects[0].code) || 0) > 0 &&
      (definition.testType !== 'foa_mock' || foaFinancialStatementsCases > 0)

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
    } else if (definition.testType === 'foa_mock' && foaFinancialStatementsCases <= 0) {
      errorMessage = 'No active Financial Statements case is available for FOA Mock right now.'
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
      ...(definition.testType === 'foa_mock'
        ? {
            financialStatementsCases: foaFinancialStatementsCases,
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

    const vol1ChapterWeightages = mergeChapterWeightages(
      vol1Subjects.map((subject) => subject.chapters)
    )
    const vol2ChapterWeightages = mergeChapterWeightages([vol2Subject?.chapters])

    const vol1Selected = await selectMockTestQuestions(
      userId,
      [...BAE_VOL1_CODES],
      distribution.vol1Count,
      vol1ChapterWeightages
    )
    const vol2Selected = await selectMockTestQuestions(
      userId,
      BAE_VOL2_CODE,
      distribution.vol2Count,
      vol2ChapterWeightages,
      { excludeQuestionIds: vol1Selected }
    )

    const vol1Map = new Map(vol1Questions.map((row) => [row.id, row]))
    const vol2Map = new Map(vol2Questions.map((row) => [row.id, row]))

    const questionSet = shuffleArray<MockSessionQuestionRef>([
      ...vol1Selected.map((questionId) => {
        const question = vol1Map.get(questionId)
        if (!question) return null
        return {
          questionId,
          subjectCode: String(question?.subject || definition.subjects[0].code).toUpperCase(),
          chapterCode: question?.chapter || null,
          volume: 'VOL1' as const,
        }
      }),
      ...vol2Selected.map((questionId) => {
        const question = vol2Map.get(questionId)
        if (!question) return null
        return {
          questionId,
          subjectCode: String(question?.subject || definition.subjects[1].code).toUpperCase(),
          chapterCode: question?.chapter || null,
          volume: 'VOL2' as const,
        }
      }),
    ].filter(Boolean) as MockSessionQuestionRef[])

    const resolvedVol1Count = questionSet.filter(
      (entry) => (entry as MockSessionMcqQuestionRef).volume === 'VOL1'
    ).length
    const resolvedVol2Count = questionSet.filter(
      (entry) => (entry as MockSessionMcqQuestionRef).volume === 'VOL2'
    ).length
    const resolvedTotalQuestions = questionSet.length
    if (resolvedTotalQuestions < 2) {
      throw new Error('Not enough questions available to generate a meaningful BAE mock test.')
    }

    const timeAllowedMinutes = calculateMockTimeAllowedMinutes(
      resolvedTotalQuestions,
      definition.timerPerQuestionSeconds
    )

    const session = await prisma.baeMockSession.create({
      data: {
        userId,
        testType: definition.testType,
        subjectIds: definition.subjects.map((subject) => subject.code),
        totalQuestions: resolvedTotalQuestions,
        timeAllowed: timeAllowedMinutes,
        vol1Count: resolvedVol1Count,
        vol2Count: resolvedVol2Count,
        questionSet,
      },
      select: { id: true },
    })

    return {
      sessionId: session.id,
      totalQuestions: resolvedTotalQuestions,
      timeAllowedMinutes,
      warning:
        distribution.warning ||
        (resolvedTotalQuestions < totalRequested
          ? `Test contains ${resolvedTotalQuestions} questions (maximum available).`
          : null),
    }
  }

  const subjectCode = definition.subjects[0].code
  const includesFinancialStatementCase = definition.testType === 'foa_mock'
  const [questions, subjectDoc, financialStatementCases] = await Promise.all([
    prisma.question.findMany({
      where: { subject: subjectCode },
      select: { id: true, chapter: true, subject: true },
    }),
    prisma.subject.findUnique({
      where: { code: subjectCode },
      select: { chapters: true },
    }),
    includesFinancialStatementCase
      ? prisma.financialStatementCase.findMany({
          where: { isActive: true },
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        })
      : Promise.resolve([]),
  ])

  if (questions.length <= 0) {
    throw new Error(`${subjectCode} has no questions yet.`)
  }

  const selectedFinancialStatementCase =
    includesFinancialStatementCase && financialStatementCases.length > 0
      ? financialStatementCases[Math.floor(Math.random() * financialStatementCases.length)]
      : null

  if (includesFinancialStatementCase && !selectedFinancialStatementCase) {
    throw new Error('No active Financial Statements case is available for FOA Mock right now.')
  }

  let finalMcqCount = Math.max(0, totalRequested - (selectedFinancialStatementCase ? 1 : 0))
  let warning: string | null = null
  if (questions.length < finalMcqCount) {
    finalMcqCount = questions.length
    const finalTotalWithFs = finalMcqCount + (selectedFinancialStatementCase ? 1 : 0)
    warning = `Test contains ${finalTotalWithFs} questions (maximum available in ${subjectCode}).`
  }

  const chapterWeightages = mergeChapterWeightages([subjectDoc?.chapters])
  const pickedIds = await selectMockTestQuestions(
    userId,
    subjectCode,
    finalMcqCount,
    chapterWeightages
  )
  const questionMap = new Map(questions.map((row) => [row.id, row]))
  const questionSet = shuffleArray<MockSessionQuestionRef>(
    pickedIds.map((questionId) => {
      const question = questionMap.get(questionId)
      if (!question) return null
      return {
        questionId,
        subjectCode: String(question?.subject || subjectCode).toUpperCase(),
        chapterCode: question?.chapter || null,
      }
    }).filter(Boolean) as MockSessionQuestionRef[]
  )

  if (pickedIds.length < finalMcqCount) {
    warning =
      warning ||
      `Test contains ${pickedIds.length + (selectedFinancialStatementCase ? 1 : 0)} questions (maximum available in ${subjectCode}).`
  }

  if (selectedFinancialStatementCase) {
    const fsQuestionRef: MockSessionFinancialStatementQuestionRef = {
      questionType: 'financial_statement',
      questionId: `fs-case-${selectedFinancialStatementCase.id}`,
      subjectCode: 'FOA',
      chapterCode: 'FINANCIAL_STATEMENTS',
      caseId: selectedFinancialStatementCase.id,
      caseNumber: selectedFinancialStatementCase.caseNumber,
      caseTitle: selectedFinancialStatementCase.title,
    }
    const insertIndex = Math.floor(Math.random() * (questionSet.length + 1))
    questionSet.splice(insertIndex, 0, fsQuestionRef)
  }

  const finalTotal = questionSet.length

  const timeAllowedMinutes = calculateMockTimeAllowedMinutes(
    finalTotal,
    definition.timerPerQuestionSeconds
  )

  const session = await prisma.baeMockSession.create({
    data: {
      userId,
      testType: definition.testType,
      subjectIds: selectedFinancialStatementCase
        ? [subjectCode, 'FINANCIAL_STATEMENTS']
        : [subjectCode],
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
  const mcqQuestionIds = questionSet
    .filter(
      (item): item is MockSessionMcqQuestionRef => item.questionType !== 'financial_statement'
    )
    .map((item) => item.questionId)
  const financialStatementCaseIds = Array.from(
    new Set(
      questionSet
        .filter(
          (item): item is MockSessionFinancialStatementQuestionRef =>
            item.questionType === 'financial_statement'
        )
        .map((item) => item.caseId)
    )
  )

  const [dbQuestions, financialStatementCases] = await Promise.all([
    mcqQuestionIds.length
      ? prisma.question.findMany({
          where: { id: { in: mcqQuestionIds } },
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
      : Promise.resolve([]),
    financialStatementCaseIds.length
      ? prisma.financialStatementCase.findMany({
          where: { id: { in: financialStatementCaseIds } },
          select: {
            id: true,
            caseNumber: true,
            title: true,
            trialBalancePdfUrl: true,
            additionalInfo: true,
            showThousandsNote: true,
            totalMarks: true,
            sociLineItems: {
              orderBy: { displayOrder: 'asc' },
              select: {
                id: true,
                heading: true,
                inputType: true,
                dropdownOptions: true,
                marks: true,
              },
            },
            sofpLineItems: {
              orderBy: { displayOrder: 'asc' },
              select: {
                id: true,
                heading: true,
                inputType: true,
                groupLabel: true,
                dropdownOptions: true,
                marks: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ])

  const questionMap = new Map(dbQuestions.map((question) => [question.id, question]))
  const financialStatementCaseMap = new Map(
    financialStatementCases.map((row) => [row.id, row])
  )
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
      if (item.questionType === 'financial_statement') {
        const financialStatementCase = financialStatementCaseMap.get(item.caseId)
        if (!financialStatementCase) return null
        return {
          index,
          id: item.questionId,
          questionType: 'financial_statement' as const,
          subject: 'FOA',
          chapter: item.chapterCode || 'FINANCIAL_STATEMENTS',
          questionNumber: 0,
          question: `${item.caseNumber} - ${item.caseTitle}`,
          imageUrl: null,
          options: [],
          optionImageUrls: [],
          explanation: '',
          difficulty: 'medium',
          allowMultiple: false,
          maxSelections: 1,
          volume: null,
          volumeLabel: 'FOA',
          chapterLabel: 'Financial Statements',
          financialStatementCase: {
            id: financialStatementCase.id,
            caseNumber: financialStatementCase.caseNumber,
            title: financialStatementCase.title,
            trialBalancePdfUrl: financialStatementCase.trialBalancePdfUrl,
            additionalInfo: financialStatementCase.additionalInfo || '',
            showThousandsNote: Boolean(financialStatementCase.showThousandsNote),
            totalMarks: Number(financialStatementCase.totalMarks || 20),
            sociLineItems: financialStatementCase.sociLineItems.map((lineItem) => ({
              id: lineItem.id,
              heading: lineItem.heading,
              inputType: lineItem.inputType || 'dropdown',
              dropdownOptions: Array.isArray(lineItem.dropdownOptions)
                ? lineItem.dropdownOptions.map((option) => String(option))
                : [],
              marks: Number(lineItem.marks) || 0,
            })),
            sofpLineItems: financialStatementCase.sofpLineItems.map((lineItem) => ({
              id: lineItem.id,
              heading: lineItem.heading,
              inputType: lineItem.inputType || 'dropdown',
              groupLabel: lineItem.groupLabel || '',
              dropdownOptions: Array.isArray(lineItem.dropdownOptions)
                ? lineItem.dropdownOptions.map((option) => String(option))
                : [],
              marks: Number(lineItem.marks) || 0,
            })),
          },
        }
      }

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
        questionType: 'mcq' as const,
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
  const answersByIndex = new Map<number, unknown>()
  let financialStatementSummary: FinancialStatementAnswerResult | null = null
  for (const answer of storedAnswers) {
    const index = Number(answer?.index)
    if (!Number.isInteger(index)) continue
    const questionType = String(answer?.questionType || '').toLowerCase()
    if (questionType === 'financial_statement') {
      const normalizedPayload = normalizeFinancialStatementPayload(
        answer?.financialStatementAnswers
      )
      answersByIndex.set(index, normalizedPayload)
      const fsResultRaw =
        answer?.financialStatementResult &&
        typeof answer.financialStatementResult === 'object' &&
        !Array.isArray(answer.financialStatementResult)
          ? (answer.financialStatementResult as Record<string, unknown>)
          : null
      if (fsResultRaw && !financialStatementSummary) {
        const parsedSummary: FinancialStatementAnswerResult = {
          caseId: Number(fsResultRaw.caseId) || 0,
          caseNumber: String(fsResultRaw.caseNumber || ''),
          caseTitle: String(fsResultRaw.caseTitle || ''),
          totalMarksObtained: Number(fsResultRaw.totalMarksObtained) || 0,
          totalMarks: Number(fsResultRaw.totalMarks) || 0,
          percentage: Number(fsResultRaw.percentage) || 0,
          attemptedLineItems: Number(fsResultRaw.attemptedLineItems) || 0,
          totalLineItems: Number(fsResultRaw.totalLineItems) || 0,
        }
        if (parsedSummary.caseId > 0) {
          financialStatementSummary = parsedSummary
        }
      }
      continue
    }
    answersByIndex.set(index, normalizeSelectedAnswer(answer?.selectedAnswer))
  }

  return {
    session,
    questions,
    answers: questions.map((question) => {
      const index = Number((question as any).index)
      const stored = answersByIndex.get(index)
      if (stored !== undefined) return stored
      return (question as any).questionType === 'financial_statement'
        ? { sociAnswers: [], sofpAnswers: [] }
        : []
    }),
    financialStatementSummary,
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
  const mcqQuestionIds = questionSet
    .filter(
      (item): item is MockSessionMcqQuestionRef => item.questionType !== 'financial_statement'
    )
    .map((item) => item.questionId)
  const financialStatementCaseIds = Array.from(
    new Set(
      questionSet
        .filter(
          (item): item is MockSessionFinancialStatementQuestionRef =>
            item.questionType === 'financial_statement'
        )
        .map((item) => item.caseId)
    )
  )

  const [questionRecords, financialStatementCases] = await Promise.all([
    mcqQuestionIds.length
      ? prisma.question.findMany({
          where: { id: { in: mcqQuestionIds } },
          select: {
            id: true,
            subject: true,
            chapter: true,
            correctAnswer: true,
            correctAnswers: true,
          },
        })
      : Promise.resolve([]),
    financialStatementCaseIds.length
      ? prisma.financialStatementCase.findMany({
          where: { id: { in: financialStatementCaseIds } },
          select: {
            id: true,
            caseNumber: true,
            title: true,
            totalMarks: true,
            sociLineItems: {
              select: {
                id: true,
                heading: true,
                inputType: true,
                correctValue: true,
                marks: true,
              },
            },
            sofpLineItems: {
              select: {
                id: true,
                heading: true,
                inputType: true,
                correctValue: true,
                marks: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ])
  const questionMap = new Map(questionRecords.map((question) => [question.id, question]))
  const financialStatementCaseMap = new Map(
    financialStatementCases.map((financialStatementCase) => [financialStatementCase.id, financialStatementCase])
  )

  let correctAnswers = 0
  let wrongAnswers = 0
  let notAttempted = 0
  let vol1Correct = 0
  let vol2Correct = 0
  const chapterMap = new Map<string, { attempted: number; correct: number }>()
  const incomingAnswers = Array.isArray(payload.answers) ? payload.answers : []

  const storedAnswers: MockSessionAnswer[] = questionSet.map((item, index) => {
    if (item.questionType === 'financial_statement') {
      const userPayload = normalizeFinancialStatementPayload(incomingAnswers[index])
      const attemptedLineItems = countFinancialStatementAttemptedLineItems(userPayload)
      const attempted = attemptedLineItems > 0
      const financialStatementCase = financialStatementCaseMap.get(item.caseId)

      if (!financialStatementCase) {
        if (!attempted) {
          notAttempted += 1
        } else {
          wrongAnswers += 1
        }
        return {
          index,
          questionId: item.questionId,
          subjectCode: 'FOA',
          chapterCode: item.chapterCode || 'FINANCIAL_STATEMENTS',
          questionType: 'financial_statement',
          selectedAnswer: [],
          isCorrect: false,
          attempted,
          financialStatementAnswers: userPayload,
          financialStatementResult: null,
        }
      }

      const sociResults = buildFinancialStatementAnswerSet(
        financialStatementCase.sociLineItems,
        userPayload.sociAnswers
      )
      const sofpResults = buildFinancialStatementAnswerSet(
        financialStatementCase.sofpLineItems,
        userPayload.sofpAnswers
      )
      const totalMarksObtained = Number(
        [...sociResults, ...sofpResults]
          .reduce((sum, row) => sum + (Number(row.marks_awarded) || 0), 0)
          .toFixed(2)
      )
      const totalMarks =
        Number(financialStatementCase.totalMarks) ||
        Number(
          [...financialStatementCase.sociLineItems, ...financialStatementCase.sofpLineItems]
            .reduce((sum, row) => sum + (Number(row.marks) || 0), 0)
            .toFixed(2)
        ) ||
        20
      const percentage =
        totalMarks > 0 ? Number(((totalMarksObtained / totalMarks) * 100).toFixed(2)) : 0
      const fsConsideredCorrect = percentage >= 50

      if (!attempted) {
        notAttempted += 1
      } else if (fsConsideredCorrect) {
        correctAnswers += 1
      } else {
        wrongAnswers += 1
      }

      return {
        index,
        questionId: item.questionId,
        subjectCode: 'FOA',
        chapterCode: item.chapterCode || 'FINANCIAL_STATEMENTS',
        questionType: 'financial_statement',
        selectedAnswer: [],
        isCorrect: attempted ? fsConsideredCorrect : false,
        attempted,
        financialStatementAnswers: userPayload,
        financialStatementResult: {
          caseId: financialStatementCase.id,
          caseNumber: financialStatementCase.caseNumber,
          caseTitle: financialStatementCase.title,
          totalMarksObtained,
          totalMarks,
          percentage,
          attemptedLineItems,
          totalLineItems: sociResults.length + sofpResults.length,
        },
      }
    }

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

  try {
    const historyRows = storedAnswers
      .filter((answer) => answer.questionType !== 'financial_statement')
      .map((answer) => ({
        userId,
        questionId: answer.questionId,
        mockTestId: completedSession.id,
        answeredCorrectly: Boolean(answer.isCorrect),
        seenAt: new Date(),
      }))

    if (historyRows.length > 0) {
      await prisma.mockTestQuestionHistory.createMany({
        data: historyRows,
        skipDuplicates: true,
      })
    }
  } catch (historyError) {
    console.error('Failed to save mock test question history:', historyError)
  }

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
