export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit') || '10'
    let settings: any = null
    try {
      settings = await prisma.systemSettings.findFirst()
    } catch {
      settings = null
    }
    const testSettings = {
      demoEnabled: true,
      demoMaxQuestions: 10,
      ...(settings?.testSettings || {}),
    }

    if (!testSettings.demoEnabled) {
      return NextResponse.json({ error: 'Demo is disabled' }, { status: 403 })
    }

    const configuredLimit = Math.min(Math.max(parseInt(String(testSettings.demoMaxQuestions), 10) || 10, 1), 10)
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || configuredLimit, 1), configuredLimit)
    const allowedSubjects = Array.isArray(testSettings.demoSubjects)
      ? testSettings.demoSubjects.map((code: string) => String(code).trim().toUpperCase()).filter(Boolean)
      : []

    let reportedIds: string[] = []
    try {
      const reports = await prisma.questionReport.findMany({
        where: { status: { not: 'resolved' } },
        select: { questionId: true },
      })
      reportedIds = Array.from(new Set(reports.map((r) => r.questionId).filter(Boolean)))
    } catch {
      reportedIds = []
    }

    const where: Prisma.QuestionWhereInput = {}
    if (reportedIds.length > 0) {
      where.id = { notIn: reportedIds }
    }
    if (allowedSubjects.length > 0) {
      where.subject = { in: allowedSubjects }
    }

    let rows = await prisma.question.findMany({
      where,
      select: {
        id: true,
        subject: true,
        chapter: true,
        questionNumber: true,
        question: true,
        imageUrl: true,
        options: true,
        correctAnswer: true,
        correctAnswers: true,
        allowMultiple: true,
        maxSelections: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit * 3, 50),
    })

    if (rows.length > limit) {
      rows = rows.sort(() => Math.random() - 0.5).slice(0, limit)
    }

    return NextResponse.json({ questions: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load demo questions' }, { status: 500 })
  }
}
