import { prisma } from '@/lib/prisma'

type LineItemInput = {
  heading: string
  inputType?: 'dropdown' | 'manual'
  groupLabel?: string
  dropdownOptions: string[]
  correctValue: string
  marks: number
  displayOrder: number
}

export type FinancialStatementCaseInput = {
  caseNumber: string
  title: string
  trialBalancePdfUrl: string
  additionalInfo?: string
  defaultTimeLimit: number
  isActive: boolean
  showThousandsNote?: boolean
  sociLineItems: LineItemInput[]
  sofpLineItems: LineItemInput[]
}

const validateLineItems = (items: LineItemInput[], label: string) => {
  if (!items.length) {
    throw new Error(`Please add at least one ${label} line item.`)
  }
  const orders = new Set<number>()
  items.forEach((item, idx) => {
    const mode = item.inputType || 'dropdown'
    if (!item.heading?.trim()) {
      throw new Error(`${label} line item ${idx + 1} needs a heading.`)
    }
    if (mode === 'dropdown') {
      if (!Array.isArray(item.dropdownOptions) || item.dropdownOptions.length < 2) {
        throw new Error(`${label} line item ${idx + 1} needs at least 2 dropdown options.`)
      }
      if (!item.dropdownOptions.includes(item.correctValue)) {
        throw new Error(`${label} line item ${idx + 1} correct value must match one of the dropdown options.`)
      }
    }
    if (mode === 'manual' && !item.correctValue?.trim()) {
      throw new Error(`${label} line item ${idx + 1} needs a correct value.`)
    }
    if (!Number.isFinite(item.marks) || item.marks < 0) {
      throw new Error(`${label} line item ${idx + 1} must have marks of 0 or more.`)
    }
    if (!Number.isFinite(item.displayOrder) || item.displayOrder < 1) {
      throw new Error(`${label} line item ${idx + 1} must have a valid display order.`)
    }
    if (orders.has(item.displayOrder)) {
      throw new Error(`${label} line item display orders must be unique.`)
    }
    orders.add(item.displayOrder)
  })
}

const totalMarks = (items: LineItemInput[]) =>
  items.reduce((sum, item) => sum + (Number(item.marks) || 0), 0)

export async function createCase(data: FinancialStatementCaseInput) {
  validateLineItems(data.sociLineItems, 'SOCI')
  validateLineItems(data.sofpLineItems, 'SOFP')

  const sociTotal = totalMarks(data.sociLineItems)
  const sofpTotal = totalMarks(data.sofpLineItems)
  const grandTotal = Number((sociTotal + sofpTotal).toFixed(2))
  if (grandTotal !== 20) {
    throw new Error(`Total marks must equal 20. Current total: ${grandTotal}`)
  }

  const created = await prisma.financialStatementCase.create({
    data: {
      caseNumber: data.caseNumber,
      title: data.title,
      trialBalancePdfUrl: data.trialBalancePdfUrl,
      additionalInfo: data.additionalInfo || '',
      defaultTimeLimit: data.defaultTimeLimit,
      isActive: data.isActive,
      showThousandsNote: Boolean(data.showThousandsNote),
      totalMarks: 20,
      sociLineItems: {
        create: data.sociLineItems.map((item) => ({
          heading: item.heading,
          inputType: item.inputType || 'dropdown',
          dropdownOptions: item.dropdownOptions,
          correctValue: item.correctValue,
          marks: item.marks,
          displayOrder: item.displayOrder,
        })),
      },
        sofpLineItems: {
          create: data.sofpLineItems.map((item) => ({
            heading: item.heading,
            inputType: item.inputType || 'dropdown',
            groupLabel: item.groupLabel || '',
            dropdownOptions: item.dropdownOptions,
            correctValue: item.correctValue,
            marks: item.marks,
            displayOrder: item.displayOrder,
          })),
      },
    },
  })

  return created.id
}

export async function updateCase(caseId: number, data: FinancialStatementCaseInput) {
  validateLineItems(data.sociLineItems, 'SOCI')
  validateLineItems(data.sofpLineItems, 'SOFP')

  const sociTotal = totalMarks(data.sociLineItems)
  const sofpTotal = totalMarks(data.sofpLineItems)
  const grandTotal = Number((sociTotal + sofpTotal).toFixed(2))
  if (grandTotal !== 20) {
    throw new Error(`Total marks must equal 20. Current total: ${grandTotal}`)
  }

  await prisma.$transaction([
    prisma.sociLineItem.deleteMany({ where: { caseId } }),
    prisma.sofpLineItem.deleteMany({ where: { caseId } }),
    prisma.financialStatementCase.update({
      where: { id: caseId },
      data: {
        caseNumber: data.caseNumber,
        title: data.title,
        trialBalancePdfUrl: data.trialBalancePdfUrl,
        additionalInfo: data.additionalInfo || '',
        defaultTimeLimit: data.defaultTimeLimit,
        isActive: data.isActive,
        showThousandsNote: Boolean(data.showThousandsNote),
        totalMarks: 20,
        sociLineItems: {
          create: data.sociLineItems.map((item) => ({
          heading: item.heading,
          inputType: item.inputType || 'dropdown',
          dropdownOptions: item.dropdownOptions,
          correctValue: item.correctValue,
          marks: item.marks,
          displayOrder: item.displayOrder,
          })),
        },
        sofpLineItems: {
          create: data.sofpLineItems.map((item) => ({
            heading: item.heading,
            inputType: item.inputType || 'dropdown',
            groupLabel: item.groupLabel || '',
            dropdownOptions: item.dropdownOptions,
            correctValue: item.correctValue,
            marks: item.marks,
            displayOrder: item.displayOrder,
          })),
        },
      },
    }),
  ])
}

export async function deleteCase(caseId: number) {
  await prisma.financialStatementCase.delete({ where: { id: caseId } })
}

export async function getAllCases(adminView = false) {
  return prisma.financialStatementCase.findMany({
    where: adminView ? {} : { isActive: true },
    orderBy: adminView ? { createdAt: 'desc' } : { caseNumber: 'asc' },
    include: {
      _count: {
        select: {
          sociLineItems: true,
          sofpLineItems: true,
        },
      },
    },
  })
}

export async function getCaseById(caseId: number) {
  const caseData = await prisma.financialStatementCase.findUnique({
    where: { id: caseId },
    include: {
      sociLineItems: { orderBy: { displayOrder: 'asc' } },
      sofpLineItems: { orderBy: { displayOrder: 'asc' } },
    },
  })
  return caseData
}

export async function startAttempt(userId: string, caseId: number, timeLimit: number) {
  const caseData = await prisma.financialStatementCase.findUnique({ where: { id: caseId } })
  if (!caseData) throw new Error('Case not found')

  const attempt = await prisma.financialStatementAttempt.create({
    data: {
      userId,
      caseId,
      caseNumber: caseData.caseNumber,
      sociAnswers: [],
      sofpAnswers: [],
      totalMarksObtained: 0,
      totalMarks: 20,
      percentageScore: 0,
      timeSpent: 0,
      timeLimitSet: timeLimit,
      startedAt: new Date(),
      submittedAt: new Date(),
      status: 'in-progress',
    },
  })

  return attempt.id
}

export async function submitAttempt(attemptId: number, sociAnswers: any[], sofpAnswers: any[], timeSpent: number) {
  const totalMarks = [...sociAnswers, ...sofpAnswers].reduce((sum, item) => sum + (Number(item.marks_awarded) || 0), 0)
  const percentage = Number(((totalMarks / 20) * 100).toFixed(2))

  await prisma.financialStatementAttempt.update({
    where: { id: attemptId },
    data: {
      sociAnswers,
      sofpAnswers,
      totalMarksObtained: totalMarks,
      percentageScore: percentage,
      timeSpent,
      submittedAt: new Date(),
      status: 'completed',
    },
  })

  return { totalMarks, percentage }
}

export async function getUserAttempts(userId: string) {
  return prisma.financialStatementAttempt.findMany({
    where: { userId },
    orderBy: { submittedAt: 'desc' },
  })
}

export async function getAttemptById(attemptId: number) {
  return prisma.financialStatementAttempt.findUnique({ where: { id: attemptId } })
}
