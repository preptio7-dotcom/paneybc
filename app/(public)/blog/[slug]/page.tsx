import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { BlogPostClient } from './BlogPostClient'
import { BlogPostStatus, BlogPostVisibility } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  PREPTIO_DEFAULT_OG_IMAGE_URL,
  buildPublicMetadata,
  preptioUrl,
  toAbsolutePreptioUrl,
} from '@/lib/seo'
import {
  ensureDefaultBlogData,
  getPopularPublishedPosts,
  getPublishedCategoriesWithCounts,
  getPublishedPostDetailBySlug,
  getRelatedPosts,
} from '@/lib/blog'
import { resolveBlogFeatureVisibility } from '@/lib/blog-server-viewer'
import { canViewBlogFeature } from '@/lib/blog-visibility'

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: BlogPostStatus.published,
        visibility: BlogPostVisibility.public,
        publishedAt: { lte: new Date() },
      },
      select: { slug: true },
    })
    return posts.map((post) => ({ slug: post.slug }))
  } catch (error) {
    console.error('Failed to generate static params for blog posts:', error)
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostDetailBySlug(slug, { viewer: null })
  if (!post) {
    return buildPublicMetadata({
      title: 'Post Not Found | Preptio Blog',
      description: 'This blog post could not be found.',
      path: `/blog/${encodeURIComponent(slug)}`,
    })
  }

  const title = `${post.title} | Preptio Blog`
  const description = post.excerpt?.trim()
    ? `${post.excerpt.slice(0, 155).trimEnd()}...`
    : 'Read the latest CA Foundation insights from Preptio.'
  const imageUrl = toAbsolutePreptioUrl(post.coverImageUrl || PREPTIO_DEFAULT_OG_IMAGE_URL)

  return {
    ...buildPublicMetadata({
      title,
      description,
      path: `/blog/${post.slug}`,
      type: 'article',
      imageUrl,
      publishedTime: post.publishedAt || undefined,
      authors: [post.author.name],
    }),
    keywords: post.tags,
    authors: [{ name: post.author.name }],
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await ensureDefaultBlogData()

  const blogVisibility = await resolveBlogFeatureVisibility()
  if (!canViewBlogFeature(blogVisibility, null)) {
    notFound()
  }

  const { slug } = await params
  const post = await getPublishedPostDetailBySlug(slug, { viewer: null })
  if (!post) notFound()

  const [relatedPosts, popularPosts, categories] = await Promise.all([
    getRelatedPosts(post.category.id, post.id, 3, { viewer: null }),
    getPopularPublishedPosts(5, { viewer: null }),
    getPublishedCategoriesWithCounts({ viewer: null }),
  ])

  const canonicalUrl = preptioUrl(`/blog/${post.slug}`)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: toAbsolutePreptioUrl(post.coverImageUrl || PREPTIO_DEFAULT_OG_IMAGE_URL),
    author: {
      '@type': 'Person',
      name: post.author.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Preptio',
      logo: {
        '@type': 'ImageObject',
        url: PREPTIO_DEFAULT_OG_IMAGE_URL,
      },
    },
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  }

  return (
    <main className="w-full">
      <Navigation />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <BlogPostClient
          post={post}
          relatedPosts={relatedPosts}
          popularPosts={popularPosts}
          categories={categories}
        />
      </Suspense>
      <Footer />
    </main>
  )
}
