export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { ensureDefaultBlogData, slugify } from '@/lib/blog'

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

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureDefaultBlogData()

  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  return NextResponse.json({ categories })
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const name = sanitizeText(body?.name, 80)
  const description = sanitizeText(body?.description, 240)
  const color = sanitizeText(body?.color || '#16a34a', 20) || '#16a34a'
  const requestedSlug = sanitizeText(body?.slug, 120)

  if (!name) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }

  const slug = await ensureUniqueCategorySlug(requestedSlug || name)

  const category = await prisma.blogCategory.create({
    data: {
      name,
      slug,
      description: description || null,
      color,
    },
  })

  return NextResponse.json({ category })
}

