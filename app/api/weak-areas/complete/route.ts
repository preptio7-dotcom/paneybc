export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateUserPracticeStreak } from '@/lib/practice-streak'
import { invalidateUserRecommendationCache } from '@/lib/study-recommendations'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const answeredCount = Number(body?.answeredCount || 0)

    if (answeredCount > 0) {
      void updateUserPracticeStreak(prisma, user.userId, new Date(), {
        endpoint: '/api/weak-areas/complete',
      }).catch((error: any) => {
        console.error('Weak area streak update failed:', error)
      })

      void invalidateUserRecommendationCache(prisma, user.userId).catch((error: any) => {
        console.error('Weak area recommendation cache invalidation failed:', error)
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to mark completion' }, { status: 500 })
  }
}
