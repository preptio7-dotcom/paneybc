export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { recordIpSecurityAudit, unblockIpAddress } from '@/lib/ip-security'

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
    const blockedRecord = await prisma.blockedIp.findUnique({
      where: { id },
    })

    if (!blockedRecord || !blockedRecord.isActive) {
      return NextResponse.json({ error: 'Blocked IP not found' }, { status: 404 })
    }

    await unblockIpAddress(blockedRecord.ipAddress)

    await recordIpSecurityAudit({
      adminId: admin.userId,
      action: 'UNBLOCK_IP',
      ipAddress: blockedRecord.ipAddress,
      reason: 'Unblocked from admin panel',
      metadata: { blockedId: blockedRecord.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to unblock IP' },
      { status: 500 }
    )
  }
}
