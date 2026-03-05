'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock3, Copy, Eye, Facebook } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { BlogCard } from '@/components/blog/blog-card'
import type { BlogCategoryDto, BlogPostDto } from '@/lib/blog-types'
import { BLOG_SUBJECT_META } from '@/lib/blog-related-subjects'
import { getProxyMediaUrl, proxyImageSourcesInHtml } from '@/lib/media-url'

type TocItem = {
  id: string
  text: string
}

type BlogPostDetail = BlogPostDto & {
  content: string
  metaTitle: string | null
  metaDescription: string | null
  author: BlogPostDto['author'] & {
    bio: string | null
  }
}

type SubjectCount = {
  code: string
  name: string
  totalQuestions: number
}

type CtaPosition = 'mid_article' | 'end_article'
type SharePlatform = 'whatsapp' | 'facebook' | 'copy'

function formatDate(value: string | null) {
  if (!value) return 'Draft'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Draft'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatShortDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatQuestionLabel(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Questions'
  return `${value.toLocaleString()} Questions`
}

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function withHeadingIds(html: string) {
  const toc: TocItem[] = []
  let index = 0

  const content = String(html || '').replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (full, attrs, rawText) => {
    const plain = String(rawText || '').replace(/<[^>]+>/g, '').trim()
    if (!plain) return full
    const id = `${slugifyHeading(plain) || 'section'}-${index + 1}`
    index += 1
    toc.push({ id, text: plain })
    if (String(attrs || '').includes('id=')) return `<h2${attrs}>${rawText}</h2>`
    return `<h2${attrs} id="${id}">${rawText}</h2>`
  })

  return { content, toc }
}

function splitAfterParagraph(html: string, paragraphIndex: number) {
  const matches = [...String(html || '').matchAll(/<\/p>/gi)]
  if (matches.length < paragraphIndex) {
    return { before: html, after: '', hasSplit: false }
  }
  const target = matches[paragraphIndex - 1]
  const endIndex = (target.index || 0) + target[0].length
  return { before: html.slice(0, endIndex), after: html.slice(endIndex), hasSplit: true }
}

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

function currentShareUrl(slug: string) {
  if (typeof window !== 'undefined') return window.location.href
  return `https://preptio.com/blog/${slug}`
}

function PracticeCta({
  postId,
  relatedSubjects,
  subjectCounts,
  position,
  onOpen,
}: {
  postId: string
  relatedSubjects: string[]
  subjectCounts: Record<string, SubjectCount>
  position: CtaPosition
  onOpen: (args: { href: string; subjectCode: string; position: CtaPosition }) => void
}) {
  const normalizedSubjects = relatedSubjects
    .map((code) => String(code || '').toUpperCase())
    .filter((code): code is keyof typeof BLOG_SUBJECT_META => code in BLOG_SUBJECT_META)

  if (normalizedSubjects.length === 1) {
    const code = normalizedSubjects[0]
    const subject = BLOG_SUBJECT_META[code]
    const count = subjectCounts[code]?.totalQuestions || 0
    return (
      <section className="relative my-8 overflow-hidden rounded-[20px] border-2 border-[#86efac] bg-[linear-gradient(135deg,#f0fdf4,#dcfce7)] p-6">
        <span className="pointer-events-none absolute -top-2 right-4 text-[76px] opacity-[0.08]">{subject.emoji}</span>
        <span className="inline-flex rounded-full bg-primary-green px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
          Free to Use
        </span>
        <h3 className="mt-3 text-lg font-bold text-[#166534]">{`Practice ${subject.name} on Preptio`}</h3>
        <p className="mt-2 text-sm text-[#166534]/90">
          {count > 0
            ? `Test your knowledge with ${count.toLocaleString()}+ real exam questions — completely free.`
            : 'Test your knowledge with real CA exam questions — completely free.'}
        </p>
        <button
          type="button"
          onClick={() => onOpen({ href: subject.route, subjectCode: code, position })}
          className="mt-4 inline-flex rounded-xl bg-primary-green px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-green-700"
        >
          {'Start Practicing ->'}
        </button>
      </section>
    )
  }

  if (normalizedSubjects.length > 1) {
    return (
      <section className="relative my-8 overflow-hidden rounded-[20px] border-2 border-[#86efac] bg-[linear-gradient(135deg,#f0fdf4,#dcfce7)] p-6">
        <span className="pointer-events-none absolute -top-2 right-4 text-[76px] opacity-[0.08]">📚</span>
        <h3 className="text-lg font-bold text-[#166534]">Practice These Topics on Preptio - Free</h3>
        <div className="mt-4 space-y-2">
          {normalizedSubjects.map((code) => {
            const subject = BLOG_SUBJECT_META[code]
            const count = subjectCounts[code]?.totalQuestions || 0
            return (
              <button
                key={`${postId}-${position}-${code}`}
                type="button"
                onClick={() => onOpen({ href: subject.route, subjectCode: code, position })}
                className="flex w-full items-center justify-between rounded-xl border border-[#86efac] bg-white px-4 py-3 text-left text-sm font-semibold text-[#166534] transition-colors hover:border-primary-green hover:bg-[#f0fdf4]"
              >
                <span>{`${subject.emoji} ${subject.name}`}</span>
                <span>{`${formatQuestionLabel(count)} ->`}</span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section className="my-8 overflow-hidden rounded-[20px] border-2 border-[#86efac] bg-[linear-gradient(135deg,#f0fdf4,#dcfce7)] p-6">
      <h3 className="text-lg font-bold text-[#166534]">Ready to test your CA knowledge?</h3>
      <p className="mt-2 text-sm text-[#166534]/90">
        Practice with 4,000+ real ICAP exam questions on Preptio — completely free.
      </p>
      <button
        type="button"
        onClick={() => onOpen({ href: '/auth/signup', subjectCode: 'GENERIC', position })}
        className="mt-4 inline-flex rounded-xl bg-primary-green px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-green-700"
      >
        {'Start Practicing Free ->'}
      </button>
    </section>
  )
}

export function BlogPostClient({
  post,
  relatedPosts,
  popularPosts,
  categories,
}: {
  post: BlogPostDetail
  relatedPosts: BlogPostDto[]
  popularPosts: BlogPostDto[]
  categories: BlogCategoryDto[]
}) {
  const searchParams = useSearchParams()
  const isAdminPreview = searchParams.get('preview') === 'admin'
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [viewsCount, setViewsCount] = useState(post.viewsCount)
  const [subjectCounts, setSubjectCounts] = useState<Record<string, SubjectCount>>({})

  const sessionIdRef = useRef<string | null>(null)
  const pageViewEventIdRef = useRef<string | null>(null)
  const maxScrollDepthRef = useRef(0)
  const readCompleteTrackedRef = useRef(false)
  const startedAtRef = useRef(0)

  const proxiedContent = useMemo(() => proxyImageSourcesInHtml(post.content), [post.content])
  const prepared = useMemo(() => withHeadingIds(proxiedContent), [proxiedContent])
  const paragraphSplit = useMemo(() => splitAfterParagraph(prepared.content, 3), [prepared.content])
  const showToc = prepared.toc.length >= 3
  const relatedSubjects = useMemo(
    () =>
      Array.isArray(post.relatedSubjects)
        ? post.relatedSubjects
            .map((item) => String(item || '').toUpperCase())
            .filter((code): code is keyof typeof BLOG_SUBJECT_META => code in BLOG_SUBJECT_META)
        : [],
    [post.relatedSubjects]
  )

  const trackAnalytics = useCallback(
    async (eventType: string, payload: Record<string, unknown> = {}, keepalive = true) => {
      if (isAdminPreview) return null
      const sessionId = sessionIdRef.current || getSessionId()
      sessionIdRef.current = sessionId
      try {
        const response = await fetch('/api/blog/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: eventType,
            post_id: post.id,
            session_id: sessionId,
            ...payload,
          }),
          keepalive,
        })
        if (!response.ok) return null
        return await response.json().catch(() => null)
      } catch {
        return null
      }
    },
    [isAdminPreview, post.id]
  )

  const handleCtaOpen = useCallback(
    ({ href, subjectCode, position }: { href: string; subjectCode: string; position: CtaPosition }) => {
      if (!isAdminPreview) {
        void fetch('/api/blog/cta-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_id: post.id,
            subject_code: subjectCode,
            cta_position: position,
            session_id: sessionIdRef.current || getSessionId(),
          }),
          keepalive: true,
        }).catch(() => undefined)
      }
      window.open(href, '_blank', 'noopener,noreferrer')
    },
    [isAdminPreview, post.id]
  )

  const handleShareClick = useCallback(
    (platform: SharePlatform) => {
      const shareUrl = currentShareUrl(post.slug)
      const shareText = `${post.title} - Preptio Blog`
      if (!isAdminPreview) {
        void trackAnalytics('share_click', { share_platform: platform })
      }
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank', 'noopener,noreferrer')
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')
      }
    },
    [isAdminPreview, post.slug, post.title, trackAnalytics]
  )

  const copyLink = useCallback(async () => {
    const shareUrl = currentShareUrl(post.slug)
    try {
      if (!isAdminPreview) {
        void trackAnalytics('share_click', { share_platform: 'copy' })
      }
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [isAdminPreview, post.slug, trackAnalytics])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const postEventKey = `blog_page_view_event_${post.id}`
    sessionIdRef.current = getSessionId()
    pageViewEventIdRef.current = null
    maxScrollDepthRef.current = 0
    readCompleteTrackedRef.current = false
    startedAtRef.current = Date.now()

    const flushPageMetrics = () => {
      if (isAdminPreview) return
      const eventId = pageViewEventIdRef.current || sessionStorage.getItem(postEventKey)
      if (!eventId) return
      const timeSpent = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
      const body = JSON.stringify({
        event_type: 'page_view',
        post_id: post.id,
        session_id: sessionIdRef.current || getSessionId(),
        update_event_id: eventId,
        time_on_page: timeSpent,
        scroll_depth: maxScrollDepthRef.current,
      })
      navigator.sendBeacon('/api/blog/analytics', body)
    }

    const onScroll = () => {
      const article = document.querySelector<HTMLElement>('.post-content')
      if (!article) {
        setProgress(0)
        return
      }

      const articleTop = article.offsetTop
      const articleHeight = article.offsetHeight
      const viewportHeight = window.innerHeight
      const scrollTop = window.scrollY
      const maxScrollable = Math.max(1, articleHeight - viewportHeight)
      const scrollInside = Math.min(Math.max(0, scrollTop - articleTop), maxScrollable)
      const percent = Math.min(100, (scrollInside / maxScrollable) * 100)
      setProgress(percent)

      const depth = Math.max(0, Math.min(100, Math.floor(percent)))
      if (depth > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = depth
      }
      if (!readCompleteTrackedRef.current && depth >= 80 && !isAdminPreview) {
        readCompleteTrackedRef.current = true
        void trackAnalytics('read_complete', { scroll_depth: depth })
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) flushPageMetrics()
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.addEventListener('visibilitychange', onVisibilityChange)

    if (!isAdminPreview) {
      const viewedKey = `viewed_post_${post.id}`
      if (!sessionStorage.getItem(viewedKey)) {
        sessionStorage.setItem(viewedKey, '1')
        setViewsCount((prev) => prev + 1)
        void fetch(`/api/blog/${post.id}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => undefined)
      }

      sessionStorage.setItem(
        'blog_referral',
        JSON.stringify({
          post_id: post.id,
          post_slug: post.slug,
          visited_at: Date.now(),
          session_id: sessionIdRef.current,
        })
      )

      void trackAnalytics('page_view', { referrer_source: detectSource() }).then((data) => {
        const eventId = data?.eventId ? String(data.eventId) : ''
        if (!eventId) return
        pageViewEventIdRef.current = eventId
        sessionStorage.setItem(postEventKey, eventId)
      })
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flushPageMetrics()
    }
  }, [isAdminPreview, post.id, post.slug, trackAnalytics])

  useEffect(() => {
    if (isAdminPreview || !relatedSubjects.length) return
    let mounted = true

    const run = async () => {
      try {
        const response = await fetch(`/api/public/blog/cta-subjects?codes=${encodeURIComponent(relatedSubjects.join(','))}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (!mounted) return
        const map: Record<string, SubjectCount> = {}
        const rows = Array.isArray(data?.subjects) ? data.subjects : []
        for (const row of rows) {
          const code = String(row?.code || '').toUpperCase()
          if (!code) continue
          map[code] = {
            code,
            name: String(row?.name || BLOG_SUBJECT_META[code as keyof typeof BLOG_SUBJECT_META]?.name || code),
            totalQuestions: Number(row?.totalQuestions || 0),
          }
        }
        setSubjectCounts(map)
      } catch {
        // keep fallback
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [isAdminPreview, relatedSubjects])

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="fixed left-0 right-0 top-0 z-[9999] h-[3px] bg-transparent">
        <div className="h-full bg-primary-green transition-[width] duration-100" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,720px)_280px] xl:items-start">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 md:p-10">
            <Link href="/blog" className="text-sm text-slate-500 hover:text-primary-green">
              {'<- Back to Blog'}
            </Link>

            <div className="mt-4">
              <span
                className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: `${post.category.color}1A`,
                  borderColor: `${post.category.color}33`,
                  color: post.category.color,
                }}
              >
                {post.category.name}
              </span>
              <h1 className="mt-4 text-[32px] font-black leading-tight text-[#0f172a] md:text-[36px]">{post.title}</h1>
              <p className="mt-4 border-l-4 border-primary-green pl-4 text-[17px] italic leading-[1.7] text-slate-500">{post.excerpt}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-[#dcfce7] bg-[#f0fdf4]">
                  {post.author.avatarUrl ? (
                    <Image
                      src={getProxyMediaUrl(post.author.avatarUrl)}
                      alt={post.author.name}
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary-green">
                      {post.author.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">{post.author.name}</p>
                  <p className="text-xs text-slate-500">{post.author.designation || 'Preptio Contributor'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Published: {formatDate(post.publishedAt)}</span>
                <span className="inline-flex items-center gap-1"><Clock3 size={12} />{post.readingTime} min read</span>
                <span className="inline-flex items-center gap-1"><Eye size={12} />{viewsCount} views</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => handleShareClick('whatsapp')} className="rounded-lg bg-[#25D366] px-4 py-2 text-xs font-semibold text-white">
                Share on WhatsApp
              </button>
              <button type="button" onClick={() => handleShareClick('facebook')} className="inline-flex items-center gap-1 rounded-lg bg-[#1877F2] px-4 py-2 text-xs font-semibold text-white">
                <Facebook size={12} />
                Share on Facebook
              </button>
              <button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {post.coverImageUrl ? (
              <div className="relative my-8 h-[260px] overflow-hidden rounded-2xl md:h-[480px]">
                <Image
                  src={getProxyMediaUrl(post.coverImageUrl)}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 767px) 100vw, 720px"
                  priority
                />
              </div>
            ) : null}

            {showToc ? (
              <div className="mb-8 rounded-2xl border border-[#86efac] bg-[#f0fdf4] p-6">
                <h2 className="text-lg font-bold text-[#166534]">In This Article</h2>
                <ul className="mt-3">
                  {prepared.toc.map((item, index) => (
                    <li key={`${item.id}-${index}`} className="border-b border-[#bbf7d0] py-2 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          const target = document.getElementById(item.id)
                          target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className="text-left text-sm font-medium text-[#166534] transition-all hover:pl-1 hover:text-[#14532d]"
                      >
                        {item.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="post-content blog-post-content">
              {!isAdminPreview && paragraphSplit.hasSplit ? (
                <>
                  <div dangerouslySetInnerHTML={{ __html: paragraphSplit.before }} />
                  <PracticeCta postId={post.id} relatedSubjects={relatedSubjects} subjectCounts={subjectCounts} position="mid_article" onOpen={handleCtaOpen} />
                  <div dangerouslySetInnerHTML={{ __html: paragraphSplit.after }} />
                </>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: prepared.content }} />
              )}
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">Tags:</span>
                {post.tags.map((tag) => (
                  <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="rounded-full border border-[#86efac] bg-[#f0fdf4] px-3 py-1 text-xs font-medium text-[#166534]">
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-[#0f172a]">Found this helpful? Share it!</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => handleShareClick('whatsapp')} className="rounded-lg bg-[#25D366] px-4 py-2 text-xs font-semibold text-white">Share on WhatsApp</button>
                <button type="button" onClick={() => handleShareClick('facebook')} className="inline-flex items-center gap-1 rounded-lg bg-[#1877F2] px-4 py-2 text-xs font-semibold text-white">
                  <Facebook size={12} />
                  Share on Facebook
                </button>
                <button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {!isAdminPreview ? (
              <PracticeCta postId={post.id} relatedSubjects={relatedSubjects} subjectCounts={subjectCounts} position="end_article" onOpen={handleCtaOpen} />
            ) : null}

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#dcfce7] bg-white">
                  {post.author.avatarUrl ? (
                    <Image
                      src={getProxyMediaUrl(post.author.avatarUrl)}
                      alt={post.author.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary-green">
                      {post.author.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-[#0f172a]">{post.author.name}</h3>
                  <p className="inline-flex rounded-full bg-white px-2 py-1 text-xs font-semibold text-primary-green">
                    {post.author.designation || 'Preptio Contributor'}
                  </p>
                  <p className="mt-3 text-sm leading-[1.7] text-slate-500">{post.author.bio || 'Passionate about helping students prepare better for exams.'}</p>
                </div>
              </div>
            </div>

            {relatedPosts.length ? (
              <section className="mt-10">
                <h3 className="text-2xl font-bold text-[#0f172a]">You Might Also Like</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {relatedPosts.map((related) => (
                    <BlogCard key={related.id} post={related} compact />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-8 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#15803d)] p-6 text-white">
              <h3 className="text-2xl font-black">Put Your Knowledge to the Test</h3>
              <p className="mt-2 text-sm text-white/85">Practice with 4,000+ real CA exam questions on Preptio.</p>
              <Link href="/auth/signup" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-green">
                {'Start Practicing Free ->'}
              </Link>
            </section>
          </article>

          <aside className="hidden space-y-5 xl:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#0f172a]">Browse by Category</h3>
              <div className="mt-3 space-y-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/blog?category=${encodeURIComponent(category.slug)}`}
                    className="flex items-center justify-between text-sm text-slate-600 transition-colors hover:text-primary-green"
                  >
                    <span>{category.name}</span>
                    <span className="text-xs text-slate-400">{category.postCount || 0}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#0f172a]">Popular Articles</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {popularPosts.map((popular) => (
                  <Link key={popular.id} href={`/blog/${popular.slug}`} className="block py-3">
                    <p className="line-clamp-2 text-sm font-medium text-slate-700 hover:text-primary-green">{popular.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{`${popular.viewsCount} views · ${formatShortDate(popular.publishedAt)}`}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .blog-post-content h2 { margin: 40px 0 16px; border-left: 4px solid #16a34a; padding-left: 14px; color: #0f172a; font-size: 24px; font-weight: 700; line-height: 1.3; }
        .blog-post-content h3 { margin: 28px 0 12px; color: #0f172a; font-size: 20px; font-weight: 600; }
        .blog-post-content p { margin-bottom: 20px; color: #334155; font-size: 16px; line-height: 1.85; }
        .blog-post-content ul, .blog-post-content ol { margin: 16px 0 20px 24px; }
        .blog-post-content li { margin-bottom: 8px; color: #334155; font-size: 16px; line-height: 1.7; }
        .blog-post-content ul li::marker, .blog-post-content ol li::marker { color: #16a34a; font-weight: 700; }
        .blog-post-content blockquote { margin: 24px 0; border-left: 4px solid #16a34a; border-radius: 0 16px 16px 0; background: #f0fdf4; padding: 16px 20px; color: #166534; font-size: 17px; font-style: italic; line-height: 1.7; }
        .blog-post-content code { border-radius: 4px; background: #f1f5f9; padding: 2px 6px; color: #0f172a; font-size: 14px; font-family: monospace; }
        .blog-post-content pre { margin: 24px 0; overflow-x: auto; border-radius: 12px; background: #0f172a; padding: 20px; color: #4ade80; font-size: 14px; font-family: monospace; }
        .blog-post-content img { display: block; margin: 28px 0; max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
        .blog-post-content a { color: #16a34a; font-weight: 500; text-decoration: underline; text-underline-offset: 3px; }
        .blog-post-content table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        .blog-post-content table th { border-bottom: 2px solid #86efac; background: #f0fdf4; padding: 12px 16px; text-align: left; color: #166534; font-weight: 700; }
        .blog-post-content table td { border-bottom: 1px solid #f1f5f9; padding: 12px 16px; color: #334155; font-size: 14px; }
        .blog-post-content table tr:hover td { background: #f8fafc; }
        .blog-post-content hr { border: none; border-top: 2px solid #f1f5f9; margin: 32px 0; }
      `}</style>
    </main>
  )
}
