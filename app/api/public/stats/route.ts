export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [totalQuestions, totalSubjects, totalUsers] = await Promise.all([
      prisma.question.count(),
      prisma.subject.count(),
      prisma.user.count({
        where: {
          role: 'student',
          isBanned: false,
        },
      }),
    ])

    return NextResponse.json(
      {
        totalQuestions,
        totalSubjects,
        totalUsers,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load stats' }, { status: 500 })
  }
}
