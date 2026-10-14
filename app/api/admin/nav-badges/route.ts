export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { withCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const badges = await withCache('admin:nav-badges', 30, async () => {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const [activeThreatIpCount, pendingFeedbackCount, newUsersTodayCount, pendingAmbassadorCount] = await Promise.all([
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
        prisma.joinUsRequest.count({
          where: {
            type: 'ambassador',
            status: 'new',
          },
        }),
      ])

      return {
        activeThreatIpCount,
        pendingFeedbackCount,
        newUsersTodayCount,
        pendingAmbassadorCount,
        notificationCount:
          activeThreatIpCount + pendingFeedbackCount + newUsersTodayCount + pendingAmbassadorCount,
      }
    })

    return NextResponse.json(badges)
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to load admin navigation badges',
      },
      { status: 500 }
    )
  }
}
