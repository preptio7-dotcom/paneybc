export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, context: { params: { code?: string } }) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const codeParam = context.params?.code || pathParts[pathParts.length - 1] || ''
    const code = codeParam.trim()
    const normalized = code.replace(/\s+/g, '').toUpperCase()
    const allSubjects = await prisma.subject.findMany()
    const subject = allSubjects.find((item) => item.code.replace(/\s+/g, '').toUpperCase() === normalized)
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      select: { questionId: true },
    })
    const reportedIds = Array.from(new Set(reports.map((r) => r.questionId).filter(Boolean)))

    const chapterCounts = await prisma.question.groupBy({
      by: ['chapter'],
      where: {
        subject: subject.code,
        ...(reportedIds.length > 0 ? { id: { notIn: reportedIds } } : {}),
      },
      _count: { _all: true },
    })

    const chapterCountMap = new Map<string, number>()
    chapterCounts.forEach((row: any) => {
      chapterCountMap.set(row.chapter || '', row._count?._all || 0)
    })

    const chapters = (subject.chapters || []).map((chapter: any) => ({
      ...chapter,
      questionCount: chapterCountMap.get(chapter.code) || 0,
    }))

    return NextResponse.json({
      subject: {
        ...subject,
        chapters,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

