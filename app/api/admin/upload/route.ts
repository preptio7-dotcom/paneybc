export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const subject = formData.get('subject') as string
    const chapterOverride = formData.get('chapter') as string

    if (!file || !subject) {
      return NextResponse.json({ error: 'File and subject are required' }, { status: 400 })
    }

    // Create intermediate upload record
    let uploadRecord;
    try {
      uploadRecord = await prisma.upload.create({
        data: {
          filename: file.name,
          subject,
          status: 'processing',
        },
      })
    } catch (dbError: any) {
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
    }

    const content = await file.text()

    // Improved splitting logic: Handle both newlines and cases where questions are concatenated
    // We look for the pattern "number|" which usually starts a new question.
    // However, splitting purely by "\n" is safer if they exist.
    // If the entire text has no newlines but multiple questions, we try to split by the pattern.

    let lines = content.split('\n').map(l => l.trim()).filter(l => l)

    // If we only have one "line" but it's very long, try to split by question pattern
    if (lines.length === 1 && (content.match(/\d+\|/g)?.length ?? 0) > 1) {
      // Regex to find start of questions: a space or start of string, followed by digits and a pipe
      // e.g. " easy 22|" -> we want to split before 22|
      lines = content.split(/\s+(?=\d+\|)/).map(l => l.trim()).filter(l => l)
    }

    const questions = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const parts = line.split('|')

      if (parts.length < 7) {
        console.warn(`Skipping malformed line ${i + 1}: ${line}`)
        continue
      }

      try {
        const hasChapterInLine = parts.length >= 10
        const offset = hasChapterInLine ? 1 : 0
        const questionNum = parseInt(parts[0])
        const correctRaw = parts[6 + offset]
        const correctParts = correctRaw.split(',').map((v: string) => v.trim()).filter(Boolean)
        const correctAns = parseInt(correctParts[0])

        if (isNaN(questionNum) || isNaN(correctAns)) {
          console.warn(`Skipping line ${i + 1} due to NaN values: ${line}`)
          continue
        }

        const chapterFromLine = hasChapterInLine ? parts[1].trim() : ''
        const chapter = chapterOverride || chapterFromLine || undefined

        const correctIndexes = correctParts.map((v: string) => parseInt(v, 10) - 1).filter((v: number) => v >= 0 && v <= 3)

        const question: any = {
          subject,
          chapter,
          questionNumber: questionNum,
          question: parts[1 + offset],
          options: [parts[2 + offset], parts[3 + offset], parts[4 + offset], parts[5 + offset]].map(opt => opt?.trim() || ''),
          correctAnswer: correctIndexes[0] ?? correctAns - 1,
          explanation: parts[7 + offset] || 'No explanation provided',
          difficulty: (parts[8 + offset] || 'medium').toLowerCase().trim(),
          uploadId: uploadRecord.id,
        }

        if (correctIndexes.length > 1) {
          question.correctAnswers = correctIndexes
          question.allowMultiple = true
          question.maxSelections = 2
        }

        // Validate difficulty
        if (!['easy', 'medium', 'hard'].includes(question.difficulty)) {
          question.difficulty = 'medium'
        }

        questions.push(question)
      } catch (e) {
        console.warn(`Error parsing line ${i + 1}:`, e)
      }
    }

    if (questions.length === 0) {
      await prisma.upload.update({
        where: { id: uploadRecord.id },
        data: { status: 'failed', error: 'No valid questions found in file' },
      })
      return NextResponse.json({ error: 'No valid questions found in file' }, { status: 400 })
    }

    const insertedQuestions = await prisma.question.createMany({ data: questions })

    // Update upload record
    await prisma.upload.update({
      where: { id: uploadRecord.id },
      data: {
        status: 'completed',
        count: insertedQuestions.count,
      },
    })

    return NextResponse.json(
      {
        message: 'Questions uploaded successfully',
        count: insertedQuestions.count,
        uploadId: uploadRecord.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Upload error:', error)

    // Try to update the record to failed if it was created
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const subject = formData.get('subject') as string

      // Since we don't have the record object easily accessible here if error happened early,
      // we'll just return the error. For better handling, we should move the record creation 
      // into a try/catch or keep it in scope.
    } catch (e) { }

    return NextResponse.json({
      error: error.message || 'An unexpected error occurred during upload'
    }, { status: 500 })
  }
}

