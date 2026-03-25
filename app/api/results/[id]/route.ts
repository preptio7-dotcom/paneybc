export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const indexToOptionText = (options: string[] | undefined, index: number) => {
  if (!options || index < 0 || index >= options.length) return '-'
  const label = String.fromCharCode(65 + index)
  const text = options[index]?.trim() || ''
  return text ? `${label}. ${text}` : label
}

const toOptionList = (options: string[] | undefined, value: number | number[]) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '-'
    return value.map((index) => indexToOptionText(options, index)).join(', ')
  }
  return indexToOptionText(options, value)
}

const formatTimeSpent = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    if (!id) {
      return NextResponse.json({ error: 'Invalid result ID' }, { status: 400 })
    }

    const result = await prisma.testResult.findUnique({ where: { id } })
    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    const answers = Array.isArray(result.answers) ? result.answers : []
    const questionIds = answers
      .map((answer: any) => answer.questionId)
      .filter((questionId: string) => typeof questionId === 'string' && questionId.length > 0)

    const questions = await prisma.question.findMany({ where: { id: { in: questionIds } } })
    const questionMap = new Map<string, any>()
    questions.forEach((question: any) => {
      questionMap.set(question.id, question)
    })

    const detailedAnswers = answers.map((answer: any, index: number) => {
      const question = questionMap.get(answer.questionId)
      const correctIndex = question?.correctAnswer ?? -1
      return {
        questionNumber: question?.questionNumber ?? index + 1,
        questionText: question?.question ?? 'Question text unavailable.',
        yourAnswer: toOptionList(question?.options, answer.selectedAnswer),
        correctAnswer: question?.correctAnswers?.length
          ? question.correctAnswers.map((idx: number) => indexToOptionText(question?.options, idx)).join(', ')
          : indexToOptionText(question?.options, correctIndex),
        isCorrect: answer.isCorrect,
        timeSpent: formatTimeSpent(answer.timeSpent),
        explanation: question?.explanation ?? '',
      }
    })

    return NextResponse.json({
      result,
      answers: detailedAnswers,
    })
  } catch (error: any) {
    console.error('Result fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

