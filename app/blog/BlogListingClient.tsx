'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, Eye, Flame, BookOpen } from 'lucide-react'
import { BlogCard } from '@/components/blog/blog-card'
import type { BlogCategoryDto, BlogPostDto } from '@/lib/blog-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const POSTS_PER_PAGE = 9

function getSessionId() {
  if (typeof window === 'undefined') return 'server'
  const key = 'preptio_session'
  let sessionId = sessionStorage.getItem(key)
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2, 18)
    sessionStorage.setItem(key, sessionId)
  }
  return sessionId
}

function detectSource() {
  if (typeof document === 'undefined') return 'direct'
  const ref = document.referrer.toLowerCase()
  if (!ref) return 'direct'
  if (ref.includes('google')) return 'google'
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp'
  if (ref.includes('facebook') || ref.includes('fb.com')) return 'facebook'
  return 'other'
}

function formatLongDate(value: string | null) {
  if (!value) return 'Draft'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Draft'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function categoryBadgeStyle(color: string) {
  const safe = color || '#16a34a'
  return {
    backgroundColor: `${safe}33`,
    borderColor: `${safe}66`,
    color: safe,
  }
}

export function BlogListingClient({
  posts,
  categories,
  popularPosts,
  featuredPost,
  stats,
  initialCategory = 'all',
  initialTag = '',
}: {
  posts: BlogPostDto[]
  categories: BlogCategoryDto[]
  popularPosts: BlogPostDto[]
  featuredPost: BlogPostDto | null
  stats: { articles: number; categories: number }
  initialCategory?: string
  initialTag?: string
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [activeTag, setActiveTag] = useState(initialTag)
  const [page, setPage] = useState(1)
  const eventIdRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)

  const filteredPosts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return posts.filter((post) => {
      if (activeCategory !== 'all' && post.category.slug !== activeCategory) return false
      if (activeTag && !post.tags.map((tag) => tag.toLowerCase()).includes(activeTag.toLowerCase())) return false
      if (!searchTerm) return true
      return (
        post.title.toLowerCase().includes(searchTerm) ||
        post.excerpt.toLowerCase().includes(searchTerm) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      )
    })
  }, [activeCategory, activeTag, posts, search])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const currentPosts = filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)

  const changeCategory = (slug: string) => {
    setActiveCategory(slug)
    setPage(1)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storageKey = 'blog_listing_page_view_event'
    const sessionId = getSessionId()
    startedAtRef.current = Date.now()
    eventIdRef.current = null

    const flushMetrics = () => {
      const eventId = eventIdRef.current || sessionStorage.getItem(storageKey)
      if (!eventId) return

      const totalScrollable = Math.max(1, document.body.scrollHeight - window.innerHeight)
      const scrollDepth = Math.max(
        0,
        Math.min(100, Math.floor(((window.scrollY || 0) / totalScrollable) * 100))
      )
      const timeSpent = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))

      navigator.sendBeacon(
        '/api/blog/analytics',
        JSON.stringify({
          event_type: 'page_view',
          post_id: null,
          session_id: sessionId,
          update_event_id: eventId,
          time_on_page: timeSpent,
          scroll_depth: scrollDepth,
        })
      )
    }

    const onVisibilityChange = () => {
      if (document.hidden) flushMetrics()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    void fetch('/api/blog/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'page_view',
        post_id: null,
        session_id: sessionId,
        referrer_source: detectSource(),
      }),
      keepalive: true,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const eventId = data?.eventId ? String(data.eventId) : ''
        if (!eventId) return
        eventIdRef.current = eventId
        sessionStorage.setItem(storageKey, eventId)
      })
      .catch(() => undefined)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flushMetrics()
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="bg-[linear-gradient(135deg,#0f172a,#1e3a5f)] py-20 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <span className="inline-flex rounded-full border border-[#4ade804d] bg-[#4ade8026] px-3.5 py-1 text-xs font-semibold tracking-[0.08em] text-[#4ade80]">
            PREPTIO BLOG
          </span>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">Learn. Prepare. Succeed.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-white/75 md:text-lg">
            Expert tips, study guides, and everything you need to ace your CA exams
          </p>
          <p className="mt-4 text-sm text-white/55">
            {stats.articles} Articles &middot; {stats.categories} Categories &middot; Updated Weekly
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {featuredPost ? (
          <Link href={`/blog/${featuredPost.slug}`} className="relative mb-8 block h-[220px] overflow-hidden rounded-[20px] md:h-[360px]">
            {featuredPost.coverImageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%), url(${featuredPost.coverImageUrl})`,
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a,#166534)]" />
            )}

            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
              <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold" style={categoryBadgeStyle(featuredPost.category.color)}>
                {featuredPost.category.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-green px-3 py-1 text-xs font-bold text-white">
                <Flame size={12} />
                Featured
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-6">
              <h2 className="line-clamp-2 text-xl font-black leading-tight md:text-[26px]">{featuredPost.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-white/85">{featuredPost.excerpt}</p>
              <p className="mt-2 text-xs text-white/70">
                By {featuredPost.author.name} - {formatLongDate(featuredPost.publishedAt)} - {featuredPost.readingTime} min read
              </p>
              <span className="mt-3 inline-flex rounded-lg border border-white/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white hover:text-[#0f172a]">
                {'Read Article ->'}
              </span>
            </div>
          </Link>
        ) : null}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search articles..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => changeCategory('all')}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-primary-green text-white'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-primary-green'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => changeCategory(category.slug)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeCategory === category.slug
                      ? 'bg-primary-green text-white'
                      : 'border border-slate-200 bg-white text-slate-500 hover:border-primary-green'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTag ? (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold">
              Filtered by tag: #{activeTag}
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTag('')
                setPage(1)
              }}
              className="text-xs font-semibold text-primary-green hover:underline"
            >
              Clear tag filter
            </button>
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {currentPosts.map((post, index) => (
                <BlogCard key={post.id} post={post} priority={index < 2} />
              ))}
            </div>

            {!currentPosts.length ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                No posts match your current filters.
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="gap-1"
              >
                <ChevronLeft size={14} />
                Previous
              </Button>

              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                return (
                  <button
                    key={`blog-page-${pageNumber}`}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                      pageNumber === currentPage
                        ? 'bg-primary-green text-white'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {pageNumber}
                  </button>
                )
              })}

              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          <aside className="hidden space-y-5 xl:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#0f172a]">Browse by Category</h3>
              <div className="mt-3 space-y-2">
                {categories.map((category) => (
                  <button
                    key={`sidebar-${category.id}`}
                    type="button"
                    onClick={() => changeCategory(category.slug)}
                    className="flex w-full items-center justify-between text-left text-sm text-slate-600 transition-colors hover:text-primary-green"
                  >
                    <span className="inline-flex items-center gap-2"><BookOpen size={14} />{category.name}</span>
                    <span className="text-xs text-slate-400">{category.postCount || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#0f172a]">Popular Articles</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {popularPosts.slice(0, 5).map((post) => (
                  <Link key={`popular-${post.id}`} href={`/blog/${post.slug}`} className="block py-3">
                    <p className="line-clamp-2 text-sm font-medium text-slate-700 hover:text-primary-green">{post.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                      <Eye size={12} />
                      {post.viewsCount} views
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#15803d)] p-5 text-white">
              <h3 className="text-lg font-bold">Ready to Practice?</h3>
              <p className="mt-2 text-sm text-white/85">Test your knowledge with 4,000+ real CA exam questions.</p>
              <Link href="/auth/signup" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-green">
                {'Start Practicing Free ->'}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
