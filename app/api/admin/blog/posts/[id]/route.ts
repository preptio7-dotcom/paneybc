export const runtime = 'nodejs'

import {
  BlogAuthorType,
  BlogPostStatus,
  BlogPostVisibility,
  BlogRevisionSaveType,
} from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { revalidateBlogPaths } from '@/lib/blog-cache'
import { createBlogRevision } from '@/lib/blog-revisions'
import {
  buildExcerpt,
  calculateReadingTime,
  ensureUniqueSlug,
  normalizeTags,
  slugify,
} from '@/lib/blog'
import {
  detectRelevantSubjects,
  normalizeRelatedSubjects,
} from '@/lib/blog-related-subjects'

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

function normalizeStatus(value: unknown): BlogPostStatus {
  const raw = String(value || '')
  if (raw === BlogPostStatus.published) return BlogPostStatus.published
  if (raw === BlogPostStatus.archived) return BlogPostStatus.archived
  return BlogPostStatus.draft
}

function normalizeAuthorType(value: unknown): BlogAuthorType {
  const raw = String(value || '')
  if (raw === BlogAuthorType.guest) return BlogAuthorType.guest
  if (raw === BlogAuthorType.student) return BlogAuthorType.student
  return BlogAuthorType.admin
}

function normalizeVisibility(value: unknown): BlogPostVisibility {
  return String(value || '') === BlogPostVisibility.public
    ? BlogPostVisibility.public
    : BlogPostVisibility.beta
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: true,
      category: true,
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  return NextResponse.json({ post })
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
  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const body = await request.json()
  const title = sanitizeText(body?.title ?? existing.title, 180)
  const rawSlug = sanitizeText(body?.slug ?? existing.slug, 220)
  const content = String((body?.content ?? existing.content) || '').trim()
  const providedExcerpt = sanitizeText(body?.excerpt ?? existing.excerpt, 300)
  const categoryId = sanitizeText(body?.categoryId ?? existing.categoryId, 80)
  const authorId = sanitizeText(body?.authorId ?? existing.authorId, 80)
  const coverImageUrl = sanitizeText(body?.coverImageUrl ?? existing.coverImageUrl ?? '', 500)
  const tags = Object.prototype.hasOwnProperty.call(body, 'tags')
    ? normalizeTags(body?.tags)
    : (existing.tags as string[] | null) || []
  const relatedSubjects = Object.prototype.hasOwnProperty.call(body, 'relatedSubjects')
    ? normalizeRelatedSubjects(body?.relatedSubjects)
    : normalizeRelatedSubjects(existing.relatedSubjects)
  const status = Object.prototype.hasOwnProperty.call(body, 'status')
    ? normalizeStatus(body?.status)
    : existing.status
  const authorType = Object.prototype.hasOwnProperty.call(body, 'authorType')
    ? normalizeAuthorType(body?.authorType)
    : existing.authorType
  const featured = Object.prototype.hasOwnProperty.call(body, 'featured')
    ? Boolean(body?.featured)
    : existing.featured
  const visibility = Object.prototype.hasOwnProperty.call(body, 'visibility')
    ? normalizeVisibility(body?.visibility)
    : existing.visibility
  const publishAtRaw = Object.prototype.hasOwnProperty.call(body, 'publishedAt')
    ? body?.publishedAt
      ? new Date(body.publishedAt)
      : null
    : existing.publishedAt
  const publishAt =
    publishAtRaw && !Number.isNaN(publishAtRaw.getTime()) ? publishAtRaw : null
  const scheduledAtRaw = Object.prototype.hasOwnProperty.call(body, 'scheduledAt')
    ? body?.scheduledAt
      ? new Date(body.scheduledAt)
      : null
    : existing.scheduledAt
  const scheduledAt =
    scheduledAtRaw && !Number.isNaN(scheduledAtRaw.getTime()) ? scheduledAtRaw : null

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }
  if (!categoryId) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 })
  }
  if (!authorId) {
    return NextResponse.json({ error: 'Author is required' }, { status: 400 })
  }

  const [author, category] = await Promise.all([
    prisma.blogAuthor.findUnique({ where: { id: authorId } }),
    prisma.blogCategory.findUnique({ where: { id: categoryId } }),
  ])
  if (!author) {
    return NextResponse.json({ error: 'Selected author does not exist' }, { status: 400 })
  }
  if (!category) {
    return NextResponse.json({ error: 'Selected category does not exist' }, { status: 400 })
  }

  const slug = await ensureUniqueSlug(rawSlug || slugify(title), id)
  const excerpt = providedExcerpt || buildExcerpt(content, 300)
  const readingTime = calculateReadingTime(content)
  const resolvedRelatedSubjects = relatedSubjects.length
    ? relatedSubjects
    : detectRelevantSubjects({
        title,
        excerpt,
        content,
        tags,
      })
  const metaTitle = sanitizeText(body?.metaTitle ?? existing.metaTitle ?? title, 120) || title
  const metaDescription =
    sanitizeText(body?.metaDescription ?? existing.metaDescription ?? excerpt, 300) || excerpt

  const nextPublishedAt =
    status === BlogPostStatus.published
      ? publishAt || existing.publishedAt || new Date()
      : publishAt
  const nextScheduledAt =
    status === BlogPostStatus.draft && scheduledAt && scheduledAt.getTime() > Date.now()
      ? scheduledAt
      : null

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImageUrl: coverImageUrl || null,
      authorId,
      authorType,
      categoryId,
      tags,
      relatedSubjects: resolvedRelatedSubjects,
      status,
      visibility,
      featured,
      readingTime,
      metaTitle,
      metaDescription,
      publishedAt: nextPublishedAt,
      scheduledAt: nextScheduledAt,
    },
    include: {
      author: true,
      category: true,
    },
  })

  const shouldCreateRevision =
    existing.title !== post.title ||
    existing.content !== post.content ||
    existing.excerpt !== post.excerpt ||
    (existing.coverImageUrl || null) !== (post.coverImageUrl || null) ||
    existing.status !== post.status
    ||
    JSON.stringify(normalizeRelatedSubjects(existing.relatedSubjects)) !==
      JSON.stringify(resolvedRelatedSubjects)

  if (shouldCreateRevision) {
    const saveType: BlogRevisionSaveType =
      status === BlogPostStatus.published && existing.status !== BlogPostStatus.published
        ? BlogRevisionSaveType.publish
        : status !== existing.status
          ? BlogRevisionSaveType.status_change
          : status === BlogPostStatus.published
            ? BlogRevisionSaveType.publish
            : BlogRevisionSaveType.manual_save

    await createBlogRevision({
      postId: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      coverImageUrl: post.coverImageUrl,
      savedBy: admin.userId,
      saveType,
    })
  }

  revalidateBlogPaths({
    slug: post.slug,
    previousSlug: existing.slug,
  })

  return NextResponse.json({ post })
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
  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      status: BlogPostStatus.archived,
      featured: false,
    },
  })

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

  return NextResponse.json({ post, success: true })
}
