export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { getEffectiveSeats, wouldExceedSeats } from '@/lib/org-access'
import type { OrgRole } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/organizations/[id]/members — list members with user details
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

    const org = await prisma.organization.findUnique({
      where: { id },
      include: { subscription: true },
    })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const [memberships, total] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: { orgId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentRole: true,
              institute: true,
              enrollmentType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.organizationMembership.count({ where: { orgId: id } }),
    ])

    return NextResponse.json({
      members: memberships,
      total,
      pages: Math.ceil(total / limit),
      page,
      seatLimit: getEffectiveSeats(org as any),
    })
  } catch (err) {
    console.error('[admin/organizations/[id]/members] GET error:', err)
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 })
  }
}

// POST /api/admin/organizations/[id]/members — enroll a user by email or userId
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const role: OrgRole = (body.role as OrgRole) || 'member'

    // Accept either email or userId
    const email = (body.email as string)?.trim()
    const userId = body.userId as string | undefined

    if (!email && !userId)
      return NextResponse.json({ error: 'email or userId is required' }, { status: 400 })

    const org = await prisma.organization.findUnique({
      where: { id },
      include: { subscription: true },
    })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    if (!org.isActive) return NextResponse.json({ error: 'Organization is inactive' }, { status: 400 })

    // Seat check
    const over = await wouldExceedSeats(org as any, 1)
    if (over)
      return NextResponse.json(
        { error: `Seat limit of ${getEffectiveSeats(org as any)} reached` },
        { status: 422 }
      )

    const user = await prisma.user.findFirst({
      where: email ? { email } : { id: userId },
      select: { id: true, name: true, email: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Upsert — idempotent
    const membership = await prisma.organizationMembership.upsert({
      where: { orgId_userId: { orgId: id, userId: user.id } },
      create: { orgId: id, userId: user.id, role },
      update: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json({ membership }, { status: 201 })
  } catch (err) {
    console.error('[admin/organizations/[id]/members] POST error:', err)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}

// DELETE /api/admin/organizations/[id]/members?userId=...
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    await prisma.organizationMembership.delete({
      where: { orgId_userId: { orgId: id, userId } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025')
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    console.error('[admin/organizations/[id]/members] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
