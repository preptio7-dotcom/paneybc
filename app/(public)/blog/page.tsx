import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { BlogListingClient } from './BlogListingClient'
import { buildPublicMetadata } from '@/lib/seo'
import {
  ensureDefaultBlogData,
  getAllPublishedPosts,
  getBlogStats,
  getFeaturedPublishedPost,
  getPopularPublishedPosts,
  getPublishedCategoriesWithCounts,
} from '@/lib/blog'
import { canViewBlogFeature } from '@/lib/blog-visibility'
import { resolveBlogFeatureVisibility, resolveServerBlogViewer } from '@/lib/blog-server-viewer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Blog | CA Exam Tips & Study Guides | Preptio',
  description:
    'CA exam tips, study guides and ICAP news for CA Foundation students in Pakistan. Free resources on Preptio.',
  path: '/blog',
})

import { Adsense } from '@/components/adsense'

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await ensureDefaultBlogData()

  const viewer = await resolveServerBlogViewer()
  const blogVisibility = await resolveBlogFeatureVisibility()
  if (!canViewBlogFeature(blogVisibility, viewer)) {
    notFound()
  }

  const [posts, categories, popularPosts, featuredPost, stats, resolvedSearch] = await Promise.all([
    getAllPublishedPosts(300, { viewer }),
    getPublishedCategoriesWithCounts({ viewer }),
    getPopularPublishedPosts(5, { viewer }),
    getFeaturedPublishedPost({ viewer }),
    getBlogStats({ viewer }),
    searchParams || Promise.resolve({}),
  ])

  const initialCategory = String(resolvedSearch?.category || 'all')
  const initialTag = String(resolvedSearch?.tag || '')

  return (
    <main className="w-full">
      <Navigation />
      <BlogListingClient
        posts={posts}
        categories={categories}
        popularPosts={popularPosts}
        featuredPost={featuredPost}
        stats={stats}
        initialCategory={initialCategory}
        initialTag={initialTag}
      />
      <Adsense />
      <Footer />
    </main>
  )
}
