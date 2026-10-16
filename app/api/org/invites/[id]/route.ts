export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gateOrg } from '@/lib/org-access'

type Params = { params: Promise<{ id: string }> }

/** DELETE /api/org/invites/[id] — revoke an invitation that has not been accepted. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const gate = await gateOrg(request, { adminOnly: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })

    const { id } = await params
    // Scoped by orgId so one org cannot revoke another org's invitations.
    const result = await prisma.organizationInvite.deleteMany({
      where: { id, orgId: gate.ctx.orgId, acceptedAt: null },
    })
    if (result.count === 0) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[org/invites/[id]] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
  }
}
