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

    const [
      blockedCount,
      suspiciousCount,
      failedLoginsToday,
      totalEvents,
      activeThreatUnreviewedCount,
    ] = await Promise.all([
      prisma.blockedIp.count({ where: { isActive: true } }),
      prisma.ipActivityLog.count({
        where: {
          status: { in: ['suspicious', 'active_threat'] },
        },
      }),
      prisma.ipActivityLog.count({
        where: {
          activityType: 'failed_login',
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.ipActivityLog.count(),
      prisma.ipActivityLog.count({
        where: {
          status: 'active_threat',
          isReviewed: false,
        },
      }),
    ])

    return NextResponse.json({
      blockedCount,
      suspiciousCount,
      failedLoginsToday,
      totalEvents,
      activeThreatUnreviewedCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load IP security summary' },
      { status: 500 }
    )
  }
}
