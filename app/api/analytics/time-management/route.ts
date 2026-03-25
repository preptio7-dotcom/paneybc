export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const results = await prisma.testResult.findMany({ where: { userId } })
    const bySubject: Record<string, { totalDuration: number; totalQuestions: number }> = {}
    let totalDuration = 0
    let totalQuestions = 0

    results.forEach((r: any) => {
      const subject = r.subject || 'Unknown'
      if (!bySubject[subject]) {
        bySubject[subject] = { totalDuration: 0, totalQuestions: 0 }
      }
      bySubject[subject].totalDuration += r.duration || 0
      bySubject[subject].totalQuestions += r.totalQuestions || 0
      totalDuration += r.duration || 0
      totalQuestions += r.totalQuestions || 0
    })

    const avgTime = totalQuestions > 0 ? Math.round(totalDuration / totalQuestions) : 0
    const subjectStats = Object.entries(bySubject).map(([subject, stats]) => ({
      subject,
      avgTime: stats.totalQuestions ? Math.round(stats.totalDuration / stats.totalQuestions) : 0,
    }))

    return NextResponse.json({
      avgTimePerQuestion: avgTime,
      subjectStats,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

