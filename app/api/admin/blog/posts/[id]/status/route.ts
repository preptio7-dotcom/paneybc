export const runtime = 'nodejs'

import { BlogPostStatus, BlogRevisionSaveType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { createBlogRevision } from '@/lib/blog-revisions'
import { revalidateBlogPaths } from '@/lib/blog-cache'

function normalizeStatus(value: unknown): BlogPostStatus | null {
  const raw = String(value || '')
  if (raw === BlogPostStatus.draft) return BlogPostStatus.draft
  if (raw === BlogPostStatus.published) return BlogPostStatus.published
  if (raw === BlogPostStatus.archived) return BlogPostStatus.archived
  return null
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
  const status = normalizeStatus(body?.status)
  if (!status) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      status,
      featured: status === BlogPostStatus.archived ? false : existing.featured,
      scheduledAt: status === BlogPostStatus.published ? null : existing.scheduledAt,
      publishedAt:
        status === BlogPostStatus.published
          ? existing.publishedAt || new Date()
          : status === BlogPostStatus.draft
            ? null
            : existing.publishedAt,
    },
  })

  await createBlogRevision({
    postId: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    savedBy: admin.userId,
    saveType:
      status === BlogPostStatus.published
        ? BlogRevisionSaveType.publish
        : BlogRevisionSaveType.status_change,
  })

  revalidateBlogPaths({ slug: post.slug })

  return NextResponse.json({ post, success: true })
}
