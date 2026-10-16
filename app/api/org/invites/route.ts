export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gateOrg } from '@/lib/org-access'
import { createOrRefreshInvites, MAX_EMAILS_PER_REQUEST } from '@/lib/org-invites'
import type { OrgRole } from '@prisma/client'

/** GET /api/org/invites — pending and accepted invitations for this org (owner/admin). */
export async function GET(request: NextRequest) {
  try {
    const gate = await gateOrg(request, { adminOnly: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })

    const invites = await prisma.organizationInvite.findMany({
      where: { orgId: gate.ctx.orgId },
      select: { id: true, email: true, role: true, expiresAt: true, acceptedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const now = Date.now()
    return NextResponse.json({
      invites: invites.map((i) => ({
        ...i,
        status: i.acceptedAt ? 'accepted' : i.expiresAt.getTime() <= now ? 'expired' : 'pending',
      })),
    })
  } catch (err) {
    console.error('[org/invites] GET error:', err)
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 })
  }
}

/**
 * POST /api/org/invites
 * Body: { emails: string[], role?: 'member' | 'admin' | 'owner' }
 * Owners and admins can invite members and admins. Only owners can invite owners.
 */
export async function POST(request: NextRequest) {
  try {
    const gate = await gateOrg(request, { adminOnly: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })
    const { ctx } = gate

    const body = await request.json().catch(() => ({}))
    const emails = Array.isArray(body.emails) ? body.emails : body.email ? [body.email] : []
    const role: OrgRole = (body.role as OrgRole) || 'member'

    if (!['member', 'admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (role === 'owner' && ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Only an owner can invite owners' }, { status: 403 })
    }
    if (emails.length === 0) return NextResponse.json({ error: 'At least one email is required' }, { status: 400 })
    if (emails.length > MAX_EMAILS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Send at most ${MAX_EMAILS_PER_REQUEST} invitations at a time` },
        { status: 413 }
      )
    }

    const results = await createOrRefreshInvites({
      org: ctx.org,
      actorUserId: ctx.userId,
      role,
      emails,
    })

    const counts = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({ results, counts }, { status: 201 })
  } catch (err) {
    console.error('[org/invites] POST error:', err)
    return NextResponse.json({ error: 'Failed to send invitations' }, { status: 500 })
  }
}
