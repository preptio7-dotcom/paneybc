export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { slugify } from '@/lib/org-access'
import type { OrgPlanTier } from '@prisma/client'

// GET /api/admin/organizations — list all orgs with member counts
export async function GET(request: NextRequest) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const search = searchParams.get('q')?.trim() || ''

    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {}

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          subscription: {
            select: { planTier: true, seats: true, isActive: true, validUntil: true },
          },
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ])

    return NextResponse.json({
      orgs: orgs.map((org) => ({
        ...org,
        memberCount: org._count.memberships,
      })),
      total,
      pages: Math.ceil(total / limit),
      page,
    })
  } catch (err) {
    console.error('[admin/organizations] GET error:', err)
    return NextResponse.json({ error: 'Failed to list organizations' }, { status: 500 })
  }
}

// POST /api/admin/organizations — create a new org
export async function POST(request: NextRequest) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const name = (body.name as string)?.trim()
    const contactEmail = (body.contactEmail as string)?.trim() || null
    const planTier = (body.planTier as OrgPlanTier) || 'starter'
    const maxSeats = parseInt(body.maxSeats) || 30

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const slug = slugify(name)
    if (!slug) return NextResponse.json({ error: 'Name produces an invalid slug' }, { status: 400 })

    const existing = await prisma.organization.findFirst({
      where: { OR: [{ name }, { slug }] },
    })
    if (existing)
      return NextResponse.json({ error: 'An organization with that name already exists' }, { status: 409 })

    const org = await prisma.organization.create({
      data: { name, slug, contactEmail, planTier, maxSeats, isActive: true },
      include: { subscription: true, _count: { select: { memberships: true } } },
    })

    return NextResponse.json(
      { org: { ...org, memberCount: org._count.memberships } },
      { status: 201 }
    )
  } catch (err) {
    console.error('[admin/organizations] POST error:', err)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}
