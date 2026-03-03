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
  ensureDefaultBlogData,
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

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const search = sanitizeText(searchParams.get('search') || '', 120)
  const status = String(searchParams.get('status') || '')
  const categoryId = String(searchParams.get('categoryId') || '')
  const authorId = String(searchParams.get('authorId') || '')
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)))

  const where: any = {}
  if (status === 'scheduled') {
    where.status = BlogPostStatus.draft
    where.scheduledAt = { gt: new Date() }
  } else if (status && Object.values(BlogPostStatus).includes(status as BlogPostStatus)) {
    where.status = status
  }
  if (categoryId) {
    where.categoryId = categoryId
  }
  if (authorId) {
    where.authorId = authorId
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ]
  }

  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const [items, total, scheduledCount, scheduledThisWeek] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        author: true,
      },
    }),
    prisma.blogPost.count({ where }),
    prisma.blogPost.count({
      where: {
        status: BlogPostStatus.draft,
        scheduledAt: { gt: now },
      },
    }),
    prisma.blogPost.count({
      where: {
        status: BlogPostStatus.draft,
        scheduledAt: {
          gte: now,
          lte: weekEnd,
        },
      },
    }),
  ])

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    scheduledCount,
    scheduledThisWeek,
  })
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureDefaultBlogData()

  const body = await request.json()

  const title = sanitizeText(body?.title, 180)
  const rawSlug = sanitizeText(body?.slug, 220)
  const content = String(body?.content || '').trim()
  const providedExcerpt = sanitizeText(body?.excerpt, 300)
  const categoryId = sanitizeText(body?.categoryId, 80)
  const authorId = sanitizeText(body?.authorId, 80)
  const coverImageUrl = sanitizeText(body?.coverImageUrl, 500)
  const tags = normalizeTags(body?.tags)
  const providedRelatedSubjects = normalizeRelatedSubjects(body?.relatedSubjects)
  const status = normalizeStatus(body?.status)
  const authorType = normalizeAuthorType(body?.authorType)
  const visibility = normalizeVisibility(body?.visibility)
  const featured = Boolean(body?.featured)
  const publishAtRaw = body?.publishedAt ? new Date(body.publishedAt) : null
  const publishAt =
    publishAtRaw && !Number.isNaN(publishAtRaw.getTime()) ? publishAtRaw : null
  const scheduledAtRaw = body?.scheduledAt ? new Date(body.scheduledAt) : null
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

  const slug = await ensureUniqueSlug(rawSlug || slugify(title))
  const excerpt = providedExcerpt || buildExcerpt(content, 300)
  const readingTime = calculateReadingTime(content)
  const relatedSubjects = providedRelatedSubjects.length
    ? providedRelatedSubjects
    : detectRelevantSubjects({
        title,
        excerpt,
        content,
        tags,
      })
  const metaTitle = sanitizeText(body?.metaTitle || title, 120) || title
  const metaDescription = sanitizeText(body?.metaDescription || excerpt, 300) || excerpt
  const shouldPublishImmediately = status === BlogPostStatus.published && !publishAt
  const nextScheduledAt =
    status === BlogPostStatus.draft && scheduledAt && scheduledAt.getTime() > Date.now()
      ? scheduledAt
      : null

  const post = await prisma.blogPost.create({
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
      relatedSubjects,
      status,
      visibility,
      featured,
      readingTime,
      viewsCount: 0,
      metaTitle,
      metaDescription,
      publishedAt: shouldPublishImmediately ? new Date() : publishAt,
      scheduledAt: nextScheduledAt,
    },
    include: {
      author: true,
      category: true,
    },
  })

  const saveType: BlogRevisionSaveType =
    status === BlogPostStatus.published
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

  revalidateBlogPaths({ slug: post.slug })

  return NextResponse.json({ post })
}
