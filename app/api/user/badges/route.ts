export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { STREAK_BADGE_DEFINITIONS, type StreakBadgeType } from '@/lib/streak-badges'

const VALID_BADGE_TYPES = new Set(STREAK_BADGE_DEFINITIONS.map((badge) => badge.badgeType))

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await prisma.userBadge.findMany({
      where: { userId: currentUser.userId },
      orderBy: { earnedAt: 'asc' },
    })
    const byType = new Map(rows.map((row) => [row.badgeType, row]))

    const badges = STREAK_BADGE_DEFINITIONS.map((badge) => {
      const earned = byType.get(badge.badgeType)
      return {
        badgeType: badge.badgeType,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        colorClass: badge.colorClass,
        milestoneDays: badge.milestoneDays,
        earned: Boolean(earned),
        earnedAt: earned?.earnedAt || null,
        seen: earned ? Boolean(earned.seen) : true,
      }
    })

    return NextResponse.json({
      badges,
      unseenCount: badges.filter((badge) => badge.earned && !badge.seen).length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load badges' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const badgeType = String(payload?.badgeType || '').trim() as StreakBadgeType
    if (!VALID_BADGE_TYPES.has(badgeType)) {
      return NextResponse.json({ error: 'Invalid badge type' }, { status: 400 })
    }

    await prisma.userBadge.updateMany({
      where: {
        userId: currentUser.userId,
        badgeType,
      },
      data: { seen: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update badge state' }, { status: 500 })
  }
}
