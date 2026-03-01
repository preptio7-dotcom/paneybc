export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [activeThreatIpCount, pendingFeedbackCount, newUsersTodayCount] = await Promise.all([
      prisma.ipActivityLog.count({
        where: {
          status: 'active_threat',
          isReviewed: false,
        },
      }),
      prisma.userFeedback.count({
        where: { status: 'pending' },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),
    ])

    return NextResponse.json({
      activeThreatIpCount,
      pendingFeedbackCount,
      newUsersTodayCount,
      notificationCount: activeThreatIpCount + pendingFeedbackCount + newUsersTodayCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to load admin navigation badges',
      },
      { status: 500 }
    )
  }
}

