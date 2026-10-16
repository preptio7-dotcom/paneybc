export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gateOrg } from '@/lib/org-access'
import { createOrRefreshInvites } from '@/lib/org-invites'
import type { OrgRole } from '@prisma/client'

/**
 * GET /api/org/members
 * Roster for any active member. Email is shown only to owners/admins.
 * consentedAt shows whether the member has agreed to share results.
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await gateOrg(request)
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })
    const { ctx } = gate

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const isPrivileged = ctx.role === 'owner' || ctx.role === 'admin'

    const [memberships, total] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: { orgId: ctx.orgId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: isPrivileged,
              studentRole: true,
              practiceStreakCurrent: true,
              createdAt: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.organizationMembership.count({ where: { orgId: ctx.orgId } }),
    ])

    return NextResponse.json({ members: memberships, total, pages: Math.ceil(total / limit), page })
  } catch (err) {
    console.error('[org/members] GET error:', err)
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }
}

/**
 * POST /api/org/members
 * No longer adds members directly. Sends an invitation instead, so the
 * student must sign in and consent before the institute can see anything.
 * Body: { email, role? }
 */
export async function POST(request: NextRequest) {
  try {
    const gate = await gateOrg(request, { adminOnly: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })
    const { ctx } = gate

    const body = await request.json().catch(() => ({}))
    const role: OrgRole = (body.role as OrgRole) || 'member'
    if (!['member', 'admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (role === 'owner' && ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Only an owner can grant the owner role' }, { status: 403 })
    }

    const results = await createOrRefreshInvites({
      org: ctx.org,
      actorUserId: ctx.userId,
      role,
      emails: [body.email],
    })
    const [result] = results
    if (!result || result.status === 'invalid_email') {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (result.status === 'already_member') {
      return NextResponse.json({ error: 'This person is already a member' }, { status: 409 })
    }

    return NextResponse.json({ invite: result }, { status: 201 })
  } catch (err) {
    console.error('[org/members] POST error:', err)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}

/** DELETE /api/org/members?userId=... — remove a member. Scoped to this org. */
export async function DELETE(request: NextRequest) {
  try {
    const gate = await gateOrg(request, { adminOnly: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })
    const { ctx } = gate

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    if (userId === ctx.userId) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
    }

    const target = await prisma.organizationMembership.findUnique({
      where: { orgId_userId: { orgId: ctx.orgId, userId } },
      select: { role: true },
    })
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (target.role === 'owner' && ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Only an owner can remove an owner' }, { status: 403 })
    }

    await prisma.organizationMembership.delete({
      where: { orgId_userId: { orgId: ctx.orgId, userId } },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    console.error('[org/members] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
