export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { SecurityEventStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { recordIpSecurityAudit } from '@/lib/ip-security'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const status = String(body?.status || '').trim() as SecurityEventStatus

    if (!Object.values(SecurityEventStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const log = await prisma.ipActivityLog.update({
      where: { id },
      data: {
        status,
        isReviewed: status === 'active_threat' ? false : true,
        reviewedAt: status === 'active_threat' ? null : new Date(),
      },
    })

    await recordIpSecurityAudit({
      adminId: admin.userId,
      action: 'UPDATE_ACTIVITY_STATUS',
      ipAddress: log.ipAddress,
      reason: `Security activity status set to ${status}`,
      metadata: {
        logId: log.id,
        status,
      },
    })

    return NextResponse.json({ success: true, log })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update security log status' },
      { status: 500 }
    )
  }
}
