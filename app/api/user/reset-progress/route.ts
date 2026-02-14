export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const tokenUser = getCurrentUser(request as any)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = tokenUser.userId

    await prisma.$transaction([
      prisma.testResult.deleteMany({ where: { userId } }),
      prisma.reviewSchedule.deleteMany({ where: { userId } }),
      prisma.reviewNotificationLog.deleteMany({ where: { userId } }),
      prisma.studySession.deleteMany({ where: { userId } }),
      prisma.analytics.deleteMany({ where: { userId } }),
      prisma.financialStatementAttempt.deleteMany({ where: { userId } }),
      prisma.userFsProgress.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          examName: '',
          examDate: null,
          dailyQuestionGoal: 0,
          prepChecklist: [],
        },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Reset progress error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
