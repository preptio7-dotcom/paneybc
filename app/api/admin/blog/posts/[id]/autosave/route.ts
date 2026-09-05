export const runtime = 'nodejs'

import { BlogPostStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
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
  const body = await request.json()

  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  if (post.status !== BlogPostStatus.draft) {
    return NextResponse.json(
      { error: 'Autosave is only available for draft posts' },
      { status: 409 }
    )
  }

  const title = sanitizeText(body?.title ?? post.title, 180) || post.title
  const content = String(body?.content ?? (post.content || '')).trim()
  const excerpt = sanitizeText(body?.excerpt ?? post.excerpt, 300) || post.excerpt

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      content,
      excerpt,
    },
    select: {
      id: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    saved_at: updated.updatedAt.toISOString(),
  })
}
