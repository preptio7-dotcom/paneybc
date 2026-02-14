export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type ManualQuestion = {
  questionNumber: number
  chapter?: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty?: string
  imageUrl?: string
}

export async function POST(request: Request) {
  try {
    const user = getCurrentUser(request as any)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const body = await request.json()
    const subject = String(body.subject || '').trim()
    const questions = Array.isArray(body.questions) ? body.questions : []

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }
    if (!questions.length) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 })
    }

    const uploadRecord = await prisma.upload.create({
      data: {
        filename: 'manual_table_input',
        subject,
        status: 'processing',
      },
    })

    const payload = questions.map((row: ManualQuestion) => {
      const correctIndex = Number(row.correctIndex)
      const difficulty = String(row.difficulty || 'medium').toLowerCase().trim()
      return {
        subject,
        chapter: row.chapter ? String(row.chapter).trim() : undefined,
        questionNumber: Number(row.questionNumber),
        question: String(row.question || '').trim(),
        options: (row.options || []).map((opt) => String(opt || '').trim()),
        correctAnswer: Math.max(0, Math.min(3, correctIndex - 1)),
        explanation: String(row.explanation || 'No explanation provided').trim() || 'No explanation provided',
        difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
        imageUrl: row.imageUrl ? String(row.imageUrl).trim() : null,
        uploadId: uploadRecord.id,
      }
    })

    const invalid = payload.find((q) => {
      return !q.question || q.options.length !== 4 || q.options.some((opt) => !opt) || Number.isNaN(q.questionNumber)
    })
    if (invalid) {
      await prisma.upload.update({
        where: { id: uploadRecord.id },
        data: { status: 'failed', error: 'Invalid rows detected' },
      })
      return NextResponse.json({ error: 'Some rows are missing required fields' }, { status: 400 })
    }

    const inserted = await prisma.question.createMany({ data: payload })

    await prisma.upload.update({
      where: { id: uploadRecord.id },
      data: {
        status: 'completed',
        count: inserted.count,
      },
    })

    return NextResponse.json({ message: 'Questions uploaded successfully', count: inserted.count })
  } catch (error: any) {
    console.error('Manual upload error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
