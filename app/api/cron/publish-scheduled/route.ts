export const runtime = 'nodejs'

import { BlogPostStatus, BlogRevisionSaveType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { createBlogRevision } from '@/lib/blog-revisions'
import { revalidateBlogPaths } from '@/lib/blog-cache'

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const incoming = request.headers.get('x-cron-secret')
  if (secret && incoming && incoming === secret) return true
  return Boolean(requireAdminUser(request))
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const duePosts = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.draft,
      scheduledAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      coverImageUrl: true,
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  })

  let successCount = 0
  const failed: Array<{ postId: string; reason: string }> = []

  for (const post of duePosts) {
    try {
      const updated = await prisma.blogPost.update({
        where: { id: post.id },
        data: {
          status: BlogPostStatus.published,
          publishedAt: now,
          scheduledAt: null,
        },
      })

      await createBlogRevision({
        postId: updated.id,
        title: updated.title,
        content: updated.content,
        excerpt: updated.excerpt,
        coverImageUrl: updated.coverImageUrl,
        savedBy: 'system_cron',
        saveType: BlogRevisionSaveType.scheduled_publish,
      })

      revalidateBlogPaths({ slug: updated.slug })
      successCount += 1
    } catch (error: any) {
      failed.push({
        postId: post.id,
        reason: error?.message || 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    success: true,
    publishedCount: successCount,
    failedCount: failed.length,
    failed,
    processedAt: now.toISOString(),
  })
}
