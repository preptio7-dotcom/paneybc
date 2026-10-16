export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const categories = await prisma.communityCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            threads: { where: { deleted: false } },
          },
        },
      },
    })

    const mapped = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      displayOrder: c.displayOrder,
      threadCount: c._count.threads,
      isHidden: c.isHidden,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return NextResponse.json({ categories: mapped })
  } catch (error: any) {
    console.error('[Admin Community Categories GET Error]:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch subjects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
    }

    // Special feature: Sync from platform exam subjects if requested
    if (body.action === 'sync-exam-subjects') {
      const examSubjects = await prisma.subject.findMany({
        select: { name: true, code: true, description: true },
        orderBy: { name: 'asc' },
      })

      let added = 0
      for (const es of examSubjects) {
        const slug = slugify(es.code || es.name)
        if (!slug) continue
        const existing = await prisma.communityCategory.findFirst({
          where: { OR: [{ slug }, { name: es.name }] },
        })
        if (!existing) {
          await prisma.communityCategory.create({
            data: {
              name: es.name,
              slug,
              description: es.description || `Discussions, notes and exam questions for ${es.name}.`,
              displayOrder: added + 10,
              createdById: user.userId,
            },
          })
          added++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${added} subject(s) from exam curriculum to community categories.`,
        addedCount: added,
      })
    }

    const name = String(body.name || '').trim()
    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: 'Subject / Tag name must be between 2 and 100 characters.' },
        { status: 400 }
      )
    }

    const rawSlug = String(body.slug || '').trim() || name
    const slug = slugify(rawSlug)
    if (!slug) {
      return NextResponse.json({ error: 'Invalid slug generated from name.' }, { status: 400 })
    }

    // Check slug uniqueness
    const existing = await prisma.communityCategory.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: `A subject with slug "${slug}" already exists. Please choose a different name or slug.` },
        { status: 409 }
      )
    }

    const description = body.description ? String(body.description).trim().slice(0, 500) : null
    const displayOrder = Number.isInteger(Number(body.displayOrder)) ? Number(body.displayOrder) : 0

    const category = await prisma.communityCategory.create({
      data: {
        name,
        slug,
        description,
        displayOrder,
        createdById: user.userId,
      },
    })

    return NextResponse.json({
      success: true,
      category: {
        ...category,
        threadCount: 0,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Admin Community Categories POST Error]:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create subject' }, { status: 500 })
  }
}
