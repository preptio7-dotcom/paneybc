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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await context.params
    const category = await prisma.communityCategory.findUnique({ where: { id } })
    if (!category) {
      return NextResponse.json({ error: 'Subject / Tag not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Request body required' }, { status: 400 })
    }

    const updateData: any = {}

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (name.length < 2 || name.length > 100) {
        return NextResponse.json(
          { error: 'Name must be between 2 and 100 characters.' },
          { status: 400 }
        )
      }
      updateData.name = name
    }

    if (body.slug !== undefined) {
      const slug = slugify(String(body.slug).trim() || updateData.name || category.name)
      if (!slug) {
        return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 })
      }
      if (slug !== category.slug) {
        const existing = await prisma.communityCategory.findUnique({ where: { slug } })
        if (existing && existing.id !== id) {
          return NextResponse.json(
            { error: `Slug "${slug}" is already in use by another subject.` },
            { status: 409 }
          )
        }
        updateData.slug = slug
      }
    }

    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim().slice(0, 500) : null
    }

    if (body.displayOrder !== undefined) {
      const order = Number(body.displayOrder)
      if (Number.isInteger(order)) {
        updateData.displayOrder = order
      }
    }

    if (body.isHidden !== undefined) {
      if (typeof body.isHidden !== 'boolean') {
        return NextResponse.json({ error: 'isHidden must be true or false.' }, { status: 400 })
      }
      updateData.isHidden = body.isHidden
    }

    const updated = await prisma.communityCategory.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            threads: { where: { deleted: false } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      category: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        displayOrder: updated.displayOrder,
        threadCount: updated._count.threads,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('[Admin Community Category PATCH Error]:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update subject' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await context.params
    const category = await prisma.communityCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { threads: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const threadCount = category._count.threads
    const searchParams = request.nextUrl.searchParams
    const reassignTo = searchParams.get('reassignTo')

    if (threadCount > 0) {
      if (!reassignTo) {
        return NextResponse.json(
          {
            error: `Cannot delete "${category.name}" because ${threadCount} discussion(s) are assigned to it. Please reassign these discussions to another subject first.`,
            threadCount,
            requiresReassign: true,
          },
          { status: 400 }
        )
      }

      const targetCategory = await prisma.communityCategory.findUnique({
        where: { id: reassignTo },
      })
      if (!targetCategory || targetCategory.id === id) {
        return NextResponse.json(
          { error: 'Invalid destination subject for reassigning discussions.' },
          { status: 400 }
        )
      }

      // Reassign threads to target category inside transaction
      await prisma.$transaction([
        prisma.communityThread.updateMany({
          where: { categoryId: id },
          data: { categoryId: reassignTo },
        }),
        prisma.communityCategory.delete({
          where: { id },
        }),
      ])

      return NextResponse.json({
        success: true,
        message: `Reassigned ${threadCount} discussion(s) to "${targetCategory.name}" and deleted "${category.name}".`,
      })
    }

    await prisma.communityCategory.delete({ where: { id } })
    return NextResponse.json({ success: true, message: `Subject "${category.name}" deleted successfully.` })
  } catch (error: any) {
    console.error('[Admin Community Category DELETE Error]:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete subject' }, { status: 500 })
  }
}
