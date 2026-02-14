export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cases = await prisma.financialStatementCase.findMany({
      where: { isActive: true },
      select: {
        id: true,
        _count: {
          select: {
            sociLineItems: true,
            sofpLineItems: true,
          },
        },
      },
    })

    const totalCases = cases.length
    const totalQuestions = cases.reduce(
      (sum, item) => sum + item._count.sociLineItems + item._count.sofpLineItems,
      0
    )

    const attempts = await prisma.financialStatementAttempt.findMany({
      where: { userId: user.userId, status: 'completed' },
      select: { caseId: true, percentageScore: true },
    })

    const totalAttempts = attempts.length
    const completedCases = new Set(attempts.map((item) => item.caseId)).size
    const averageScore = totalAttempts
      ? Number(
          (
            attempts.reduce((sum, item) => sum + Number(item.percentageScore), 0) / totalAttempts
          ).toFixed(2)
        )
      : 0
    const bestScore = totalAttempts
      ? Number(Math.max(...attempts.map((item) => Number(item.percentageScore))).toFixed(2))
      : 0

    return NextResponse.json({
      totalCases,
      totalQuestions,
      totalAttempts,
      completedCases,
      averageScore,
      bestScore,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load summary' }, { status: 500 })
  }
}
