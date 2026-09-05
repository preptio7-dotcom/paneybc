export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const isAdmin = (request: Request) => {
  const user = getCurrentUser(request as any)
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin'))
}

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const reports = await prisma.questionReport.findMany({
      where: { status: { not: 'resolved' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const questionIds = Array.from(new Set(reports.map((r) => r.questionId).filter(Boolean)))
    const questions = questionIds.length
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
        })
      : []
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    return NextResponse.json({
      reports: reports.map((report) => ({
        ...report,
        question: questionMap.get(report.questionId) || null,
      })),
    })
  } catch (error: any) {
    console.error('Admin reports fetch error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

