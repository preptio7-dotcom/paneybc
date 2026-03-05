import type { MetadataRoute } from 'next'
import { BlogPostStatus, BlogPostVisibility } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://www.preptio.com'
export const revalidate = 300
export const runtime = 'nodejs'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Public-facing pages only.
  const staticRoutes = [
    '/',
    '/about',
    '/subjects',
    '/subjects/BAEIVII',
    '/subjects/BAEIV2E',
    '/subjects/QAFB',
    '/subjects/FOA',
    '/blog',
    '/ambassador',
    '/demo',
    '/feedback',
    '/contact',
    '/login',
    '/register',
    '/auth/login',
    '/auth/signup',
    '/join-us',
    '/privacy',
    '/terms',
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency:
      route === '/blog'
        ? 'daily'
        : route === '/'
          ? 'weekly'
          : route === '/login' || route === '/register' || route === '/auth/login' || route === '/auth/signup'
            ? 'yearly'
            : 'monthly',
    priority:
      route === '/'
        ? 1
        : route === '/subjects' || route === '/blog'
          ? 0.9
          : route === '/about'
            ? 0.8
            : route === '/ambassador'
              ? 0.7
              : route === '/contact'
                ? 0.6
                : 0.5,
  }))

  try {
    // Blog post URLs are added automatically when published public posts exist.
    // For now, if there are no published posts, only /blog listing remains in sitemap.
    const posts = await prisma.blogPost.findMany({
      where: {
        status: BlogPostStatus.published,
        visibility: BlogPostVisibility.public,
        publishedAt: { lte: new Date() },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    return [...staticEntries, ...postEntries]
  } catch (error) {
    console.error('Failed to build dynamic sitemap blog entries:', error)
    return staticEntries
  }
}
