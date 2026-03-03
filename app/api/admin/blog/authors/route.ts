export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { ensureDefaultBlogData } from '@/lib/blog'

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureDefaultBlogData()

  const authors = await prisma.blogAuthor.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  return NextResponse.json({ authors })
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const name = sanitizeText(body?.name, 80)
  const designation = sanitizeText(body?.designation, 120)
  const bio = sanitizeText(body?.bio, 600)
  const avatarUrl = sanitizeText(body?.avatarUrl, 400)

  if (!name) {
    return NextResponse.json({ error: 'Author name is required' }, { status: 400 })
  }

  const author = await prisma.blogAuthor.create({
    data: {
      name,
      designation: designation || null,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
    },
  })

  return NextResponse.json({ author })
}

