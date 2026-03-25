'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BlogCard } from '@/components/blog/blog-card'
import type { BlogPostDto } from '@/lib/blog-types'

type BlogPreviewPayload = {
  posts: BlogPostDto[]
}

export function HomeBlogSection() {
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<BlogPostDto[]>([])

  useEffect(() => {
    let mounted = true

    const loadPosts = async () => {
      try {
        const response = await fetch('/api/public/blog?latest=3&pageSize=3')
        const data: BlogPreviewPayload = await response.json()
        if (!response.ok) return
        if (!mounted) return
        const list = Array.isArray(data?.posts) ? data.posts : []
        setPosts(list.slice(0, 3))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadPosts()

    return () => {
      mounted = false
    }
  }, [])

  const visiblePosts = useMemo(() => posts.slice(0, 3), [posts])

  if (loading || !visiblePosts.length) {
    return null
  }

  return (
    <section className="w-full bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full border border-[#86efac] bg-[#dcfce7] px-4 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#166534]">
              Latest Articles
            </span>
            <h2 className="mt-4 text-3xl font-black text-[#0f172a] md:text-4xl">Tips, Guides & Insights</h2>
            <div className="mt-3 h-[3px] w-10 rounded bg-primary-green" />
            <p className="mt-3 text-sm text-slate-500 md:text-base">Expert advice to help you ace your CA exams</p>
          </div>
          <Link href="/blog" className="text-sm font-semibold text-primary-green hover:underline">
            {'View All Articles ->'}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visiblePosts.map((post, index) => (
            <div
              key={post.id}
              className={
                index === 0
                  ? 'block'
                  : index === 1
                    ? 'hidden md:block'
                    : 'hidden xl:block'
              }
            >
              <BlogCard post={post} priority={index === 0} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
