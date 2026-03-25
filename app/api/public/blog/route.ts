export const runtime = 'nodejs'

import { BlogPostStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDefaultBlogData, mapBlogPost, normalizeTags } from '@/lib/blog'
import { withCache } from '@/lib/cache'
import { getCurrentUser } from '@/lib/auth'
import { extractBetaFeatureSettings } from '@/lib/beta-features'
import { buildBlogPostVisibilityFilter, canViewBlogFeature, type BlogViewer } from '@/lib/blog-visibility'

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultBlogData()

    const currentUser = getCurrentUser(request)
    const settings = await prisma.systemSettings.findFirst({
      select: { testSettings: true },
    })
    const savedTestSettings =
      settings?.testSettings &&
      typeof settings.testSettings === 'object' &&
      !Array.isArray(settings.testSettings)
        ? (settings.testSettings as Record<string, unknown>)
        : {}
    const betaFeatures = extractBetaFeatureSettings(savedTestSettings)

    let viewer: BlogViewer | null = null
    if (currentUser) {
      if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        viewer = { role: currentUser.role, studentRole: null }
      } else {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          select: { studentRole: true },
        })
        viewer = { role: currentUser.role, studentRole: user?.studentRole || null }
      }
    }

    const featureVisibility = betaFeatures.blog
    const canViewFeature = canViewBlogFeature(featureVisibility, viewer)
    if (!canViewFeature) {
      return NextResponse.json(
        {
          posts: [],
          featuredPost: null,
          categories: [],
          totalPosts: 0,
          currentPage: 1,
          pageSize: 9,
          totalPages: 1,
          stats: {
            articles: 0,
            categories: 0,
          },
          visibility: featureVisibility,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
          },
        }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const search = sanitizeText(searchParams.get('search') || '', 120)
    const categorySlug = sanitizeText(searchParams.get('category') || '', 120)
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const pageSize = Math.min(24, Math.max(1, Number(searchParams.get('pageSize') || 9)))
    const tags = normalizeTags(
      String(searchParams.get('tag') || searchParams.get('tags') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
    const latestLimit = Math.max(1, Math.min(12, Number(searchParams.get('latest') || 0)))
    const now = new Date()

    const where: any = {
      status: BlogPostStatus.published,
      publishedAt: { lte: now },
      ...buildBlogPostVisibilityFilter(viewer),
    }

    if (categorySlug) {
      where.category = { slug: categorySlug }
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }
    // Anonymous latest-posts requests (homepage widget) can be cached
    const isAnonymousLatest = !currentUser && latestLimit > 0 && !search && !categorySlug && !tags.length

    const fetchBlogData = async () => {
      const [featuredRaw, categoriesRaw, stats] = await Promise.all([
        prisma.blogPost.findFirst({
          where: {
            status: BlogPostStatus.published,
            featured: true,
            publishedAt: { lte: now },
            ...buildBlogPostVisibilityFilter(viewer),
          },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            category: true,
            author: true,
          },
        }),
        prisma.blogCategory.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                posts: {
                  where: {
                    status: BlogPostStatus.published,
                    publishedAt: { lte: now },
                    ...buildBlogPostVisibilityFilter(viewer),
                  },
                },
              },
            },
          },
        }),
        Promise.all([
          prisma.blogPost.count({
            where: {
              status: BlogPostStatus.published,
              publishedAt: { lte: now },
              ...buildBlogPostVisibilityFilter(viewer),
            },
          }),
          prisma.blogCategory.count(),
        ]),
      ])

      let posts: ReturnType<typeof mapBlogPost>[] = []
      let totalPosts = 0

      if (tags.length) {
        const allPostsRaw = await prisma.blogPost.findMany({
          where,
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            category: true,
            author: true,
          },
          take: 500,
        })

        const loweredTags = tags.map((tag) => tag.toLowerCase())
        const tagFiltered = allPostsRaw
          .map(mapBlogPost)
          .filter((post) => {
            const postTags = post.tags.map((tag) => tag.toLowerCase())
            return loweredTags.some((tag) => postTags.includes(tag))
          })

        totalPosts = tagFiltered.length
        const start = latestLimit ? 0 : (page - 1) * pageSize
        const end = latestLimit ? latestLimit : start + pageSize
        posts = tagFiltered.slice(start, end)
      } else {
        const [count, postsRaw] = await Promise.all([
          prisma.blogPost.count({ where }),
          prisma.blogPost.findMany({
            where,
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            skip: latestLimit ? 0 : (page - 1) * pageSize,
            take: latestLimit || pageSize,
            include: {
              category: true,
              author: true,
            },
          }),
        ])

        totalPosts = count
        posts = postsRaw.map(mapBlogPost)
      }

      const featuredPost = featuredRaw ? mapBlogPost(featuredRaw) : null
      const categories = categoriesRaw.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        color: category.color,
        postCount: category._count.posts,
      }))

      return { posts, featuredPost, categories, totalPosts, stats }
    }

    const data = isAnonymousLatest
      ? await withCache(`public:blog:latest:${latestLimit}`, 120, fetchBlogData)
      : await fetchBlogData()

    return NextResponse.json(
      {
        posts: data.posts,
        featuredPost: data.featuredPost,
        categories: data.categories,
        totalPosts: data.totalPosts,
        currentPage: page,
        pageSize: latestLimit || pageSize,
        totalPages: latestLimit ? 1 : Math.max(1, Math.ceil(data.totalPosts / pageSize)),
        stats: {
          articles: data.stats[0],
          categories: data.stats[1],
        },
        visibility: featureVisibility,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load blog posts' },
      { status: 500 }
    )
  }
}
