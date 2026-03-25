export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/cache'

// ─── Cache TTL ────────────────────────────────────────────────────────────────
// Stats shown on homepage — counts change slowly, 5 min is fine
const TTL_PUBLIC_STATS = 300  // 5 minutes
const KEY_PUBLIC_STATS = 'public:stats'

export async function GET() {
  try {
    // FIX: was running 3 count queries on every homepage load
    // Same numbers for every user — cache for 5 minutes
    const stats = await withCache(
      KEY_PUBLIC_STATS,
      TTL_PUBLIC_STATS,
      () => Promise.all([
        prisma.question.count(),
        prisma.subject.count(),
        prisma.user.count({
          where: { role: 'student', isBanned: false },
        }),
      ]).then(([totalQuestions, totalSubjects, totalUsers]) => ({
        totalQuestions,
        totalSubjects,
        totalUsers,
      }))
    )

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load stats' },
      { status: 500 }
    )
  }
}