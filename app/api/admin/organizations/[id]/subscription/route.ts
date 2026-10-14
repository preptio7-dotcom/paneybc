export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import type { OrgPlanTier } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/organizations/[id]/subscription
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const sub = await prisma.organizationSubscription.findUnique({
      where: { orgId: id },
    })

    return NextResponse.json({ subscription: sub ?? null })
  } catch (err) {
    console.error('[admin/organizations/[id]/subscription] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

// PATCH /api/admin/organizations/[id]/subscription — upsert subscription
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Ensure org exists
    const org = await prisma.organization.findUnique({ where: { id } })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const body = await request.json()
    const planTier = (body.planTier as OrgPlanTier) || 'starter'
    const seats = typeof body.seats === 'number' ? body.seats : org.maxSeats
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true
    const validFrom = body.validFrom ? new Date(body.validFrom) : new Date()
    const validUntil = body.validUntil ? new Date(body.validUntil) : null
    const notes = (body.notes as string)?.trim() || null

    const subscription = await prisma.organizationSubscription.upsert({
      where: { orgId: id },
      create: {
        orgId: id,
        planTier,
        seats,
        isActive,
        validFrom,
        validUntil,
        notes,
        createdBy: actor.userId,
      },
      update: {
        planTier,
        seats,
        isActive,
        validFrom,
        validUntil,
        notes,
      },
    })

    // Sync maxSeats on org to match subscription seats
    await prisma.organization.update({
      where: { id },
      data: { maxSeats: seats, planTier },
    })

    return NextResponse.json({ subscription })
  } catch (err) {
    console.error('[admin/organizations/[id]/subscription] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}
