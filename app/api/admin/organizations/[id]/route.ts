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

    // If subscription doesn't exist yet and org is active, or if subscription details were passed:
    if (!org.subscription && org.isActive) {
      const defaultExpiry = new Date()
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1)
      await prisma.organizationSubscription.create({
        data: {
          orgId: id,
          planTier: org.planTier,
          seats: org.maxSeats,
          isActive: true,
          validFrom: new Date(),
          validUntil: defaultExpiry,
          createdBy: actor.userId,
          notes: 'Auto-initialized on organization activation',
        },
      })
    } else if (org.subscription) {
      // Keep planTier and seats aligned
      await prisma.organizationSubscription.update({
        where: { orgId: id },
        data: {
          planTier: org.planTier,
          seats: org.maxSeats,
          ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
        },
      })
    }

    const updatedOrg = await prisma.organization.findUnique({
      where: { id },
      include: { subscription: true, _count: { select: { memberships: true } } },
    })

    return NextResponse.json({
      org: updatedOrg ? { ...updatedOrg, memberCount: updatedOrg._count.memberships } : org,
    })
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
