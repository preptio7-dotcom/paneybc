import type { MetadataRoute } from 'next'
import { BlogPostStatus, BlogPostVisibility } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function getBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://preptio.com'
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '')
  return `https://${raw.replace(/\/$/, '')}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const now = new Date()

  const staticRoutes = [
    '/',
    '/about',
    '/subjects',
    '/blog',
    '/ambassador',
    '/contact',
    '/join-us',
    '/privacy',
    '/terms',
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : route === '/blog' ? 0.9 : 0.7,
  }))

  try {
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
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    return [...staticEntries, ...postEntries]
  } catch {
    return staticEntries
  }
}
