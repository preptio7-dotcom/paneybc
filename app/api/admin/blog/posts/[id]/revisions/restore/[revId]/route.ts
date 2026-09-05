export const runtime = 'nodejs'

import { BlogRevisionSaveType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { createBlogRevision } from '@/lib/blog-revisions'

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; revId: string }> }
) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, revId } = await context.params
  const body = await request.json()

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      coverImageUrl: true,
    },
  })
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const revision = await prisma.blogRevision.findFirst({
    where: {
      id: revId,
      postId: id,
    },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      coverImageUrl: true,
      revisionNumber: true,
      createdAt: true,
      saveType: true,
    },
  })

  if (!revision) {
    return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
  }

  const currentTitle = sanitizeText(body?.title ?? post.title, 180) || post.title
  const currentContent = String(body?.content ?? (post.content || '')).trim() || post.content
  const currentExcerpt = sanitizeText(body?.excerpt ?? post.excerpt, 300) || post.excerpt
  const currentCoverImageUrl =
    sanitizeText(body?.coverImageUrl ?? post.coverImageUrl ?? '', 500) || null

  await createBlogRevision({
    postId: post.id,
    title: currentTitle,
    content: currentContent,
    excerpt: currentExcerpt,
    coverImageUrl: currentCoverImageUrl,
    savedBy: admin.userId,
    saveType: BlogRevisionSaveType.pre_restore_snapshot,
  })

  return NextResponse.json({
    success: true,
    restoredRevision: revision,
  })
}
