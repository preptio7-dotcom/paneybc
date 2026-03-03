import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { BlogPostClient } from './BlogPostClient'
import {
  ensureDefaultBlogData,
  getPopularPublishedPosts,
  getPublishedCategoriesWithCounts,
  getPublishedPostDetailBySlug,
  getRelatedPosts,
} from '@/lib/blog'
import { canViewBlogFeature } from '@/lib/blog-visibility'
import { resolveBlogFeatureVisibility, resolveServerBlogViewer } from '@/lib/blog-server-viewer'

export const revalidate = 600

function getBaseUrl() {
  const fallback = 'https://preptio.com'
  const raw = process.env.NEXT_PUBLIC_APP_URL || fallback
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '')
  return `https://${raw.replace(/\/$/, '')}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostDetailBySlug(slug, { viewer: null })
  if (!post) {
    return {
      title: 'Post Not Found | Preptio Blog',
    }
  }

  const baseUrl = getBaseUrl()
  const canonicalUrl = `${baseUrl}/blog/${post.slug}`
  const metaTitle = post.metaTitle || post.title
  const metaDescription = post.metaDescription || post.excerpt
  const imageUrl = post.coverImageUrl || `${baseUrl}/web-app-manifest-512x512.png`

  return {
    title: `${metaTitle} | Preptio Blog`,
    description: metaDescription,
    keywords: post.tags.join(', '),
    authors: [{ name: post.author.name }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: canonicalUrl,
      siteName: 'Preptio',
      images: [{ url: imageUrl }],
      publishedTime: post.publishedAt || undefined,
      authors: [post.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
    },
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

  const baseUrl = getBaseUrl()
  const canonicalUrl = `${baseUrl}/blog/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImageUrl || `${baseUrl}/web-app-manifest-512x512.png`,
    author: {
      '@type': 'Person',
      name: post.author.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Preptio',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
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
