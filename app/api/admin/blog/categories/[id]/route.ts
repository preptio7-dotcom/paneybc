export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { slugify } from '@/lib/blog'

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

async function ensureUniqueCategorySlug(baseValue: string, excludeId?: string) {
  const baseSlug = slugify(baseValue) || 'category'
  let slug = baseSlug
  let counter = 2

  while (true) {
    const existing = await prisma.blogCategory.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!existing) return slug
    slug = `${baseSlug}-${counter}`
    counter += 1
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json()

  const existing = await prisma.blogCategory.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const name = sanitizeText(body?.name ?? existing.name, 80)
  const description = sanitizeText(body?.description ?? existing.description ?? '', 240)
  const color = sanitizeText(body?.color ?? existing.color, 20) || '#16a34a'
  const requestedSlug = sanitizeText(body?.slug ?? existing.slug, 120)
  const slug = await ensureUniqueCategorySlug(requestedSlug || name, id)

  const category = await prisma.blogCategory.update({
    where: { id },
    data: {
      name,
      slug,
      description: description || null,
      color,
    },
  })

  return NextResponse.json({ category })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const postCount = await prisma.blogPost.count({ where: { categoryId: id } })
  if (postCount > 0) {
    return NextResponse.json(
      {
        error: `Move ${postCount} posts to another category first`,
      },
      { status: 400 }
    )
  }

  await prisma.blogCategory.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

