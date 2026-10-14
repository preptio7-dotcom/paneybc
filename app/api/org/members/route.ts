export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgForUser, requireOrgAdmin, getEffectiveSeats, wouldExceedSeats } from '@/lib/org-access'
import type { OrgRole } from '@prisma/client'

/**
 * GET /api/org/members
 *
 * Returns the member list for the org of the logged-in user.
 * Accessible to all org members; sensitive email data only shown to owner/admin.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgForUser(request)
    if (!ctx) return NextResponse.json({ error: 'Not a member of any organization' }, { status: 403 })

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
              // Email only visible to org admins/owners
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

    return NextResponse.json({
      members: memberships,
      total,
      pages: Math.ceil(total / limit),
      page,
    })
  } catch (err) {
    console.error('[org/members] GET error:', err)
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }
}

/**
 * POST /api/org/members
 *
 * Adds a member to the org. Only org admins/owners can call this.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrgAdmin(request)
    if (!ctx) return NextResponse.json({ error: 'Only org admins can add members' }, { status: 403 })

    const body = await request.json()
    const email = (body.email as string)?.trim()
    const role: OrgRole = (body.role as OrgRole) || 'member'

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    // Seat check
    const over = await wouldExceedSeats(ctx.org, 1)
    if (over)
      return NextResponse.json(
        { error: `Seat limit of ${getEffectiveSeats(ctx.org)} reached` },
        { status: 422 }
      )

    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, name: true, email: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 })

    const membership = await prisma.organizationMembership.upsert({
      where: { orgId_userId: { orgId: ctx.orgId, userId: user.id } },
      create: { orgId: ctx.orgId, userId: user.id, role },
      update: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json({ membership }, { status: 201 })
  } catch (err) {
    console.error('[org/members] POST error:', err)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}

/**
 * DELETE /api/org/members?userId=...
 *
 * Removes a member from the org. Only org admins/owners can call this.
 */
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireOrgAdmin(request)
    if (!ctx) return NextResponse.json({ error: 'Only org admins can remove members' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    // Prevent removing yourself
    if (userId === ctx.userId)
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })

    await prisma.organizationMembership.delete({
      where: { orgId_userId: { orgId: ctx.orgId, userId } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025')
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    console.error('[org/members] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
