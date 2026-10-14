export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { slugify } from '@/lib/org-access'
import type { OrgPlanTier } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/organizations/[id]
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: true,
        _count: { select: { memberships: true } },
      },
    })
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ org: { ...org, memberCount: org._count.memberships } })
  } catch (err) {
    console.error('[admin/organizations/[id]] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

// PATCH /api/admin/organizations/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'super_admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      data.name = name
      data.slug = slugify(name)
    }
    if (typeof body.contactEmail === 'string') data.contactEmail = body.contactEmail.trim() || null
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (typeof body.maxSeats === 'number') data.maxSeats = body.maxSeats
    if (body.planTier) data.planTier = body.planTier as OrgPlanTier

    const org = await prisma.organization.update({
      where: { id },
      data,
      include: { subscription: true, _count: { select: { memberships: true } } },
    })

    return NextResponse.json({ org: { ...org, memberCount: org._count.memberships } })
  } catch (err: any) {
    if (err?.code === 'P2002')
      return NextResponse.json({ error: 'Name is already taken by another organization' }, { status: 409 })
    if (err?.code === 'P2025')
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    console.error('[admin/organizations/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}

// DELETE /api/admin/organizations/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'super_admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.organization.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025')
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    console.error('[admin/organizations/[id]] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
  }
}
