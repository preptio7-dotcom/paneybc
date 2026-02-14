export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCaseById, submitAttempt } from '@/lib/db/financial-statements'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { attemptId, sociAnswers, sofpAnswers, timeSpent, caseId } = await request.json()
    if (!attemptId || !caseId) {
      return NextResponse.json({ error: 'Attempt ID and case ID are required' }, { status: 400 })
    }

    const caseData = await getCaseById(Number(caseId))
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const normalizeAnswer = (value: string) => {
      const trimmed = String(value ?? '').trim()
      if (!trimmed) return { raw: '', num: null }
      const raw = trimmed.toLowerCase().replace(/[–—−]/g, '-')
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
        return { raw: raw.replace(/\s+/g, ' '), num: null }
      }

      const numericPattern = /^-?\d*\.?\d+$/
      let num: number | null = null
      if (numericPattern.test(numericCandidate)) {
        const normalizedNumber = isParenNegative && !numericCandidate.startsWith('-') ? `-${numericCandidate}` : numericCandidate
        const parsed = Number(normalizedNumber)
        num = Number.isFinite(parsed) ? parsed : null
      }

      return { raw: raw.replace(/\s+/g, ' ').replace(/,+/g, ''), num }
    }

    const isManualCorrect = (selected: string, correct: string) => {
      const a = normalizeAnswer(selected)
      const b = normalizeAnswer(correct)
      if (a.num !== null && b.num !== null) {
        return Math.abs(a.num - b.num) < 0.0001
      }
      return a.raw === b.raw
    }

    const buildAnswerSet = (lineItems: any[], answers: any[]) => {
      const byId = new Map<number, any>()
      lineItems.forEach((item: any) => byId.set(item.id, item))
      return lineItems.map((item: any) => {
        const answer = (answers || []).find((a: any) => Number(a.line_item_id) === Number(item.id))
        const selectedValue = answer?.selected_value ?? ''
        const mode = item.inputType || 'dropdown'
        const isCorrect = selectedValue
          ? mode === 'manual'
            ? isManualCorrect(selectedValue, item.correctValue)
            : selectedValue === item.correctValue
          : false
        return {
          line_item_id: item.id,
          heading: item.heading,
          selected_value: selectedValue,
          correct_value: item.correctValue,
          is_correct: Boolean(isCorrect),
          marks_awarded: isCorrect ? Number(item.marks) : 0,
        }
      })
    }

    const soci = buildAnswerSet(caseData.sociLineItems || [], sociAnswers || [])
    const sofp = buildAnswerSet(caseData.sofpLineItems || [], sofpAnswers || [])

    const result = await submitAttempt(Number(attemptId), soci, sofp, Number(timeSpent) || 0)
    return NextResponse.json({ result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit attempt' }, { status: 500 })
  }
}
