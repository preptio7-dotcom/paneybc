import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { BlogPostClient } from './BlogPostClient'
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
import { canViewBlogFeature } from '@/lib/blog-visibility'
import { resolveBlogFeatureVisibility, resolveServerBlogViewer } from '@/lib/blog-server-viewer'

export const dynamic = 'force-dynamic'

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

  const viewer = await resolveServerBlogViewer()
  const blogVisibility = await resolveBlogFeatureVisibility()
  if (!canViewBlogFeature(blogVisibility, viewer)) {
    notFound()
  }

  const { slug } = await params
  const post = await getPublishedPostDetailBySlug(slug, { viewer })
  if (!post) notFound()

  const [relatedPosts, popularPosts, categories] = await Promise.all([
    getRelatedPosts(post.category.id, post.id, 3, { viewer }),
    getPopularPublishedPosts(5, { viewer }),
    getPublishedCategoriesWithCounts({ viewer }),
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
      <BlogPostClient
        post={post}
        relatedPosts={relatedPosts}
        popularPosts={popularPosts}
        categories={categories}
      />
      <Footer />
    </main>
  )
}
