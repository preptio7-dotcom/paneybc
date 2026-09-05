export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
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
  const existing = await prisma.blogAuthor.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Author not found' }, { status: 404 })
  }

  const body = await request.json()
  const name = sanitizeText(body?.name ?? existing.name, 80)
  const designation = sanitizeText(body?.designation ?? existing.designation ?? '', 120)
  const bio = sanitizeText(body?.bio ?? existing.bio ?? '', 600)
  const avatarUrl = sanitizeText(body?.avatarUrl ?? existing.avatarUrl ?? '', 400)

  const author = await prisma.blogAuthor.update({
    where: { id },
    data: {
      name,
      designation: designation || null,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
    },
  })

  return NextResponse.json({ author })
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
  const postCount = await prisma.blogPost.count({ where: { authorId: id } })
  if (postCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete author with ${postCount} existing posts`,
      },
      { status: 400 }
    )
  }

  await prisma.blogAuthor.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

