export const runtime = 'nodejs'

import { BlogPostStatus, BlogRevisionSaveType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { createBlogRevision } from '@/lib/blog-revisions'
import { revalidateBlogPaths } from '@/lib/blog-cache'

type BulkAction = 'publish' | 'archive' | 'delete'

function normalizeAction(value: unknown): BulkAction | null {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'publish') return 'publish'
  if (raw === 'archive') return 'archive'
  if (raw === 'delete') return 'delete'
  return null
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)
    : []
  const action = normalizeAction(body?.action)

  if (!ids.length) {
    return NextResponse.json({ error: 'Select at least one post' }, { status: 400 })
  }
  if (!action) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const targetPosts = await prisma.blogPost.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      coverImageUrl: true,
      status: true,
    },
  })

  if (action === 'publish') {
    const result = await prisma.blogPost.updateMany({
      where: { id: { in: ids } },
      data: {
        status: BlogPostStatus.published,
        publishedAt: new Date(),
        scheduledAt: null,
      },
    })

    await Promise.all(
      targetPosts.map(async (post) => {
        await createBlogRevision({
          postId: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          coverImageUrl: post.coverImageUrl,
          savedBy: admin.userId,
          saveType:
            post.status === BlogPostStatus.published
              ? BlogRevisionSaveType.publish
              : BlogRevisionSaveType.status_change,
        })
        revalidateBlogPaths({ slug: post.slug })
      })
    )
    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  if (action === 'archive') {
    const result = await prisma.blogPost.updateMany({
      where: { id: { in: ids } },
      data: {
        status: BlogPostStatus.archived,
        featured: false,
        scheduledAt: null,
      },
    })

    await Promise.all(
      targetPosts.map(async (post) => {
        await createBlogRevision({
          postId: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          coverImageUrl: post.coverImageUrl,
          savedBy: admin.userId,
          saveType: BlogRevisionSaveType.status_change,
        })
        revalidateBlogPaths({ slug: post.slug })
      })
    )
    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  if (action === 'delete') {
    const result = await prisma.blogPost.deleteMany({
      where: { id: { in: ids } },
    })

    targetPosts.forEach((post) => {
      revalidateBlogPaths({ slug: post.slug })
    })

    return NextResponse.json({ success: true, deletedCount: result.count })
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
}
