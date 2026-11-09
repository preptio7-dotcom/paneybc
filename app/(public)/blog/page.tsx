import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
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
import { resolveBlogFeatureVisibility } from '@/lib/blog-server-viewer'

export const revalidate = 3600

export const metadata: Metadata = buildPublicMetadata({
  title: 'Blog | CA Exam Tips & Study Guides | Preptio',
  description:
    'CA exam tips, study guides and ICAP news for CA Foundation students in Pakistan. Free resources on Preptio.',
  path: '/blog',
})

export default async function BlogPage() {
  await ensureDefaultBlogData()

  const blogVisibility = await resolveBlogFeatureVisibility()
  if (!canViewBlogFeature(blogVisibility, null)) {
    notFound()
  }

  const [posts, categories, popularPosts, featuredPost, stats] = await Promise.all([
    getAllPublishedPosts(300, { viewer: null }),
    getPublishedCategoriesWithCounts({ viewer: null }),
    getPopularPublishedPosts(5, { viewer: null }),
    getFeaturedPublishedPost({ viewer: null }),
    getBlogStats({ viewer: null }),
  ])

  return (
    <main className="w-full">
      <Navigation />
      <Suspense fallback={null}>
        <BlogListingClient
          posts={posts}
          categories={categories}
          popularPosts={popularPosts}
          featuredPost={featuredPost}
          stats={stats}
        />
      </Suspense>
      <Footer />
    </main>
  )
}
