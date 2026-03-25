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

    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    if (results.length === 0) {
      return NextResponse.json({ prediction: null })
    }

    const scores = results.map((r: any) => r.weightedPercent ?? r.score ?? 0)
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
    const trend = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0
    const prediction = Math.round(Math.min(Math.max(avg + trend * 0.1, 0), 100))

    return NextResponse.json({
      prediction,
      avg: Math.round(avg),
      trend: Math.round(trend),
      recentScores: scores
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

