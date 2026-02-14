export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [totalQuestions, totalSubjects] = await Promise.all([
      prisma.question.count(),
      prisma.subject.count(),
    ])

    return NextResponse.json({
      totalQuestions,
      totalSubjects,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load stats' }, { status: 500 })
  }
}
