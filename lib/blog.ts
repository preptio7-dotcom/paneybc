import { prisma } from '@/lib/prisma'
import { BlogAuthorType, BlogPostStatus } from '@prisma/client'
import { buildBlogPostVisibilityFilter, type BlogViewer } from '@/lib/blog-visibility'

const AVG_WORDS_PER_MINUTE = 200

export type BlogListItem = {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImageUrl: string | null
  tags: string[]
  relatedSubjects: string[]
  status: BlogPostStatus
  featured: boolean
  readingTime: number
  viewsCount: number
  publishedAt: string | null
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
  authorType: BlogAuthorType
  author: {
    id: string
    name: string
    avatarUrl: string | null
    designation: string | null
  }
  category: {
    id: string
    name: string
    slug: string
    color: string
    description: string | null
  }
}

export type BlogPostDetail = BlogListItem & {
  content: string
  metaTitle: string | null
  metaDescription: string | null
  author: BlogListItem['author'] & {
    bio: string | null
  }
}

const BLOG_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImageUrl: true,
  tags: true,
  relatedSubjects: true,
  status: true,
  featured: true,
  readingTime: true,
  viewsCount: true,
  metaTitle: true,
  metaDescription: true,
  publishedAt: true,
  scheduledAt: true,
  createdAt: true,
  updatedAt: true,
  authorType: true,
  author: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      designation: true,
      bio: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      description: true,
    },
  },
} as const

const DEFAULT_CATEGORIES = [
  {
    name: 'Exam Tips',
    slug: 'exam-tips',
    description: 'Actionable exam strategy and preparation methods.',
    color: '#16a34a',
  },
  {
    name: 'Study Guides',
    slug: 'study-guides',
    description: 'Structured guides for CA exam preparation.',
    color: '#2563eb',
  },
  {
    name: 'ICAP News',
    slug: 'icap-news',
    description: 'Latest ICAP announcements and policy changes.',
    color: '#7c3aed',
  },
  {
    name: 'Subject Guides',
    slug: 'subject-guides',
    description: 'Topic-wise insights for each CA subject.',
    color: '#ea580c',
  },
  {
    name: 'Success Stories',
    slug: 'success-stories',
    description: 'Student journeys and practical lessons learned.',
    color: '#0284c7',
  },
] as const

export function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeIncomingSlug(rawSlug: string) {
  const value = String(rawSlug || '').trim()
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function stripHtml(html: string) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function calculateReadingTime(content: string) {
  const wordCount = stripHtml(content)
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / AVG_WORDS_PER_MINUTE))
}

export function buildExcerpt(content: string, maxLength = 300) {
  const plainText = stripHtml(content)
  if (plainText.length <= maxLength) return plainText
  return `${plainText.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

export function normalizeTags(input: unknown) {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const tags: string[] = []
  for (const tag of input) {
    const normalized = String(tag || '').trim().toLowerCase()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    tags.push(normalized)
    if (tags.length >= 10) break
  }
  return tags
}

export function parseTagQuery(rawTags: unknown) {
  const rawValue = String(rawTags || '')
  if (!rawValue) return []
  return normalizeTags(
    rawValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  )
}

function parseJsonTags(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 10)
}

export function mapBlogPost(post: any): BlogListItem {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl || null,
    tags: parseJsonTags(post.tags),
    relatedSubjects: parseJsonTags(post.relatedSubjects).map((item) => item.toUpperCase()),
    status: post.status,
    featured: Boolean(post.featured),
    readingTime: Number(post.readingTime || 1),
    viewsCount: Number(post.viewsCount || 0),
    publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
    scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString() : null,
    createdAt: new Date(post.createdAt).toISOString(),
    updatedAt: new Date(post.updatedAt).toISOString(),
    authorType: post.authorType,
    author: {
      id: post.author?.id || '',
      name: post.author?.name || 'Preptio Team',
      avatarUrl: post.author?.avatarUrl || null,
      designation: post.author?.designation || null,
    },
    category: {
      id: post.category?.id || '',
      name: post.category?.name || 'General',
      slug: post.category?.slug || 'general',
      color: post.category?.color || '#16a34a',
      description: post.category?.description || null,
    },
  }
}

export async function ensureUniqueSlug(titleOrSlug: string, excludeId?: string) {
  const baseSlug = slugify(titleOrSlug) || 'untitled-post'
  let slug = baseSlug
  let counter = 2

  while (true) {
    const existing = await prisma.blogPost.findFirst({
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

export async function ensureDefaultBlogData() {
  const categoryCount = await prisma.blogCategory.count()
  if (categoryCount === 0) {
    await prisma.blogCategory.createMany({
      data: DEFAULT_CATEGORIES.map((item) => ({
        name: item.name,
        slug: item.slug,
        description: item.description,
        color: item.color,
      })),
    })
  }

  let defaultAuthor = await prisma.blogAuthor.findFirst({
    where: {
      name: 'Preptio Team',
    },
  })

  if (!defaultAuthor) {
    defaultAuthor = await prisma.blogAuthor.create({
      data: {
        name: 'Preptio Team',
        bio: 'Official content team at Preptio.',
        designation: 'Preptio Team',
      },
    })
  }

  return defaultAuthor
}

export async function getBlogStats(options?: { viewer?: BlogViewer | null }) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const [articles, categories] = await Promise.all([
    prisma.blogPost.count({
      where: { status: BlogPostStatus.published, ...visibilityWhere },
    }),
    prisma.blogCategory.count(),
  ])

  return {
    articles,
    categories,
  }
}

export async function getLatestPublishedPosts(limit = 3, options?: { viewer?: BlogViewer | null }) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const posts = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.published,
      publishedAt: { lte: new Date() },
      ...visibilityWhere,
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(1, Math.min(limit, 20)),
    select: BLOG_SELECT,
  })

  return posts.map(mapBlogPost)
}

export async function getFeaturedPublishedPost(options?: { viewer?: BlogViewer | null }) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const post = await prisma.blogPost.findFirst({
    where: {
      status: BlogPostStatus.published,
      featured: true,
      publishedAt: { lte: new Date() },
      ...visibilityWhere,
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: BLOG_SELECT,
  })

  return post ? mapBlogPost(post) : null
}

export async function getAllPublishedPosts(limit = 300, options?: { viewer?: BlogViewer | null }) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const posts = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.published,
      publishedAt: { lte: new Date() },
      ...visibilityWhere,
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(1, Math.min(limit, 500)),
    select: BLOG_SELECT,
  })

  return posts.map(mapBlogPost)
}

export async function getPopularPublishedPosts(limit = 5, options?: { viewer?: BlogViewer | null }) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const posts = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.published,
      publishedAt: { lte: new Date() },
      ...visibilityWhere,
    },
    orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
    take: Math.max(1, Math.min(limit, 10)),
    select: BLOG_SELECT,
  })
  return posts.map(mapBlogPost)
}

export async function getPublishedCategoriesWithCounts(options?: { viewer?: BlogViewer | null }) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          posts: {
            where: {
              status: BlogPostStatus.published,
              publishedAt: { lte: new Date() },
              ...visibilityWhere,
            },
          },
        },
      },
    },
  })

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    color: category.color,
    postCount: category._count.posts,
  }))
}

export async function getPublishedPostBySlug(slug: string, options?: { viewer?: BlogViewer | null }) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const resolvedSlug = normalizeIncomingSlug(slug)
  const post = await prisma.blogPost.findFirst({
    where: {
      slug: {
        equals: resolvedSlug,
        mode: 'insensitive',
      },
      status: BlogPostStatus.published,
      publishedAt: { lte: new Date() },
      ...visibilityWhere,
    },
    select: BLOG_SELECT,
  })

  return post ? mapBlogPost(post) : null
}

export async function getPublishedPostDetailBySlug(
  slug: string,
  options?: { viewer?: BlogViewer | null }
): Promise<BlogPostDetail | null> {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const resolvedSlug = normalizeIncomingSlug(slug)
  const post = await prisma.blogPost.findFirst({
    where: {
      slug: {
        equals: resolvedSlug,
        mode: 'insensitive',
      },
      status: BlogPostStatus.published,
      publishedAt: { lte: new Date() },
      ...visibilityWhere,
    },
    select: BLOG_SELECT,
  })
  if (!post) return null

  const mapped = mapBlogPost(post)
  return {
    ...mapped,
    content: post.content,
    metaTitle: post.metaTitle || null,
    metaDescription: post.metaDescription || null,
    author: {
      ...mapped.author,
      bio: post.author?.bio || null,
    },
  }
}

export async function getRelatedPosts(
  categoryId: string,
  excludePostId: string,
  limit = 3,
  options?: { viewer?: BlogViewer | null }
) {
  const visibilityWhere = buildBlogPostVisibilityFilter(options?.viewer)
  const posts = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.published,
      categoryId,
      id: { not: excludePostId },
      publishedAt: { lte: new Date() },
      ...visibilityWhere,
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(1, Math.min(limit, 6)),
    select: BLOG_SELECT,
  })

  return posts.map(mapBlogPost)
}
