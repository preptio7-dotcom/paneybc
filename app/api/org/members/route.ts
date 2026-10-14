export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgForUser } from '@/lib/org-access'

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
