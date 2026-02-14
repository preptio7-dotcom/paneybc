export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit') || '10'
    const settings = await prisma.systemSettings.findFirst()
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

    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      select: { questionId: true },
    })
    const reportedIds = Array.from(new Set(reports.map((r) => r.questionId).filter(Boolean)))

    const conditions: Prisma.Sql[] = []
    if (reportedIds.length > 0) {
      conditions.push(Prisma.sql`"id" NOT IN (${Prisma.join(reportedIds)})`)
    }
    if (allowedSubjects.length > 0) {
      conditions.push(Prisma.sql`"subject" IN (${Prisma.join(allowedSubjects)})`)
    }

    const whereClause = conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, Prisma.sql` AND `)}`
      : Prisma.sql``

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        "id",
        "subject",
        "chapter",
        "questionNumber",
        "question",
        "imageUrl",
        "options",
        "correctAnswer",
        "correctAnswers",
        "allowMultiple",
        "maxSelections"
      FROM "Question"
      ${whereClause}
      ORDER BY RANDOM()
      LIMIT ${limit};
    `

    return NextResponse.json({ questions: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load demo questions' }, { status: 500 })
  }
}
