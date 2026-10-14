export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { recordIpSecurityAudit, removeWhitelistedIpById } from '@/lib/ip-security'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const whitelist = await prisma.whitelistedIp.findUnique({ where: { id } })
    if (!whitelist) {
      return NextResponse.json({ error: 'Whitelist entry not found' }, { status: 404 })
    }

    await removeWhitelistedIpById(id)

    await recordIpSecurityAudit({
      adminId: admin.userId,
      action: 'REMOVE_WHITELIST_IP',
      ipAddress: whitelist.ipAddress,
      reason: 'Removed from whitelist',
      metadata: {
        whitelistId: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to remove whitelist entry' },
      { status: 500 }
    )
  }
}
