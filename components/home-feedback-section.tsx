'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { type HomepageThemeVariant } from '@/lib/homepage-theme'
import { useAuth } from '@/lib/auth-context'
import { canAccessBetaFeature } from '@/lib/beta-features'

type FeedbackReview = {
  id: string
  rating: number
  message: string
  createdAt: string
  user: {
    name: string
    city: string
    level: string
    avatar: string
  }
}

type FeedbackPayload = {
  sectionVisible: boolean
  visibility?: 'public' | 'beta_ambassador'
  averageRating: number | null
  totalReviews: number
  reviews: FeedbackReview[]
}

const MAX_READ_MORE_LENGTH = 270
const AUTO_SCROLL_MS = 5000
const AUTO_SCROLL_MS_414 = 5800
const AUTO_SCROLL_MS_375 = 6500

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date)
}

function getFirstInitial(name: string) {
  const value = String(name || '').trim()
  if (!value) return 'S'
  return value.charAt(0).toUpperCase()
}

function getAverageRating(reviews: FeedbackReview[]) {
  if (!reviews.length) return null
  const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
  return Number((total / reviews.length).toFixed(1))
}

function RatingStars({ rating, size = 18 }: { rating: number; size?: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`rating-star-${index}`}
          size={size}
          className={index < safe ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-slate-300'}
        />
      ))}
    </div>
  )
}

function FeedbackCard({
  review,
  isExpanded,
  onToggleReadMore,
  delayMs,
  animateIn,
}: {
  review: FeedbackReview
  isExpanded: boolean
  onToggleReadMore: (id: string) => void
  delayMs: number
  animateIn: boolean
}) {
  const hasLongMessage = review.message.length > MAX_READ_MORE_LENGTH
  const levelTag = review.user.level || 'CA Student'

  return (
    <article
      className={`relative min-h-[240px] max-[414px]:min-h-[224px] max-[375px]:min-h-[208px] overflow-hidden rounded-[24px] border border-black/10 bg-white p-5 md:p-8 transition-all duration-250 ease-out hover:-translate-y-1.5 hover:border-[#86efac] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_16px_48px_rgba(0,0,0,0.12)] shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] ${
        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="absolute left-0 right-0 top-0 h-[3px] bg-[linear-gradient(90deg,#16a34a,#4ade80,#86efac)]" />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-5 right-4 z-0 text-[80px] md:text-[120px] leading-none text-[#dcfce7]/80"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        &quot;
      </span>

      <div className="relative z-[1] flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {review.user.avatar ? (
              <Image
                src={review.user.avatar}
                alt={review.user.name}
                width={52}
                height={52}
                sizes="(max-width: 767px) 44px, 52px"
                className="h-11 w-11 md:h-[52px] md:w-[52px] rounded-full object-cover border-[3px] border-[#dcfce7] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                loading="lazy"
              />
            ) : (
              <div className="h-11 w-11 md:h-[52px] md:w-[52px] rounded-full bg-primary-green text-white font-bold flex items-center justify-center border-[3px] border-[#dcfce7] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                {getFirstInitial(review.user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-[#0f172a]">{review.user.name || 'Student'}</p>
              <p className="truncate text-xs text-[#64748b] mt-0.5">{review.user.city || 'Pakistan'}</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-[11px] font-semibold text-[#1d4ed8]">
            {levelTag}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <RatingStars rating={review.rating} size={18} />
          <span className="text-[13px] text-[#64748b]">{review.rating}/5</span>
        </div>

        <div className="mt-3 flex-1 text-[14px] leading-[1.75] italic text-[#334155]">
          <p className={isExpanded ? '' : 'line-clamp-4'}>{review.message}</p>
          {hasLongMessage ? (
            <button
              type="button"
              onClick={() => onToggleReadMore(review.id)}
              className="mt-1 text-sm font-semibold text-primary-green hover:underline not-italic"
            >
              {isExpanded ? 'Show less' : 'Read more \u2192'}
            </button>
          ) : null}
        </div>

        <div className="mt-4 border-t border-[#f1f5f9] pt-3 text-xs text-[#94a3b8]">
          {formatDate(review.createdAt)}
        </div>
      </div>
    </article>
  )
}

export function HomeFeedbackSection({
  themeVariant = 'gray',
  reduceMotion = false,
}: {
  themeVariant?: HomepageThemeVariant
  reduceMotion?: boolean
}) {
  const { user, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [payload, setPayload] = useState<FeedbackPayload | null>(null)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSmall414, setIsSmall414] = useState(false)
  const [isSmall375, setIsSmall375] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [selectedSnap, setSelectedSnap] = useState(0)
  const [snapCount, setSnapCount] = useState(0)
  const [sectionNode, setSectionNode] = useState<HTMLElement | null>(null)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    dragFree: false,
    skipSnaps: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaMobile = window.matchMedia('(max-width: 767px)')
    const media414 = window.matchMedia('(max-width: 414px)')
    const media375 = window.matchMedia('(max-width: 375px)')
    const update = () => {
      setIsMobile(mediaMobile.matches)
      setIsSmall414(media414.matches)
      setIsSmall375(media375.matches)
    }
    update()

    mediaMobile.addEventListener('change', update)
    media414.addEventListener('change', update)
    media375.addEventListener('change', update)
    return () => {
      mediaMobile.removeEventListener('change', update)
      media414.removeEventListener('change', update)
      media375.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    let isMounted = true
    const loadFeedback = async () => {
      try {
        const response = await fetch(`/api/public/feedback?t=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'cache-control': 'no-cache',
            pragma: 'no-cache',
          },
        })
        if (!response.ok) {
          if (isMounted) setPayload(null)
          return
        }
        const data = await response.json()
        if (isMounted) setPayload(data && typeof data === 'object' ? data : null)
      } catch {
        if (isMounted) setPayload(null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadFeedback()
    return () => {
      isMounted = false
    }
  }, [authLoading, user?.id, user?.studentRole])

  useEffect(() => {
    if (reduceMotion) {
      setIsVisible(true)
      return
    }

    if (!sectionNode) return
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(sectionNode)
    return () => observer.disconnect()
  }, [sectionNode, reduceMotion])

  const reviews = useMemo(() => {
    if (!payload?.reviews) return []
    return payload.reviews.slice(0, 20)
  }, [payload])

  const useCarousel = reviews.length >= 3
  const visibility = payload?.visibility ?? 'public'
  const canViewForRole = canAccessBetaFeature(visibility, user?.studentRole) || user?.role === 'admin' || user?.role === 'super_admin'
  const sectionVisible = Boolean(payload?.sectionVisible && reviews.length > 0 && canViewForRole)
  const isBeta = payload?.visibility === 'beta_ambassador'
  const isDark = themeVariant === 'dark'
  const autoplayDelay = isSmall375 ? AUTO_SCROLL_MS_375 : isSmall414 ? AUTO_SCROLL_MS_414 : AUTO_SCROLL_MS

  const averageRating = useMemo(() => getAverageRating(reviews), [reviews])
  const totalReviews = reviews.length

  useEffect(() => {
    if (!emblaApi || !useCarousel) return

    const onSelect = () => {
      setSelectedSnap(emblaApi.selectedScrollSnap())
      setSnapCount(emblaApi.scrollSnapList().length)
    }

    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, useCarousel])

  useEffect(() => {
    if (!emblaApi || !useCarousel || reduceMotion || isHovered) return

    const timer = window.setInterval(() => {
      emblaApi.scrollNext()
    }, autoplayDelay)

    return () => window.clearInterval(timer)
  }, [emblaApi, useCarousel, reduceMotion, isHovered, autoplayDelay])

  const toggleReadMore = useCallback((id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [])

  if (isLoading || !sectionVisible) {
    return null
  }

  const sectionBgClass = isDark ? 'bg-[#0f172a]' : 'bg-[#f0fdf4]'

  return (
    <section
      id="student-feedback"
      ref={setSectionNode}
      className={`relative w-full overflow-hidden py-[64px] md:py-[96px] ${sectionBgClass}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(34,197,94,0.03) 0px, rgba(34,197,94,0.03) 1px, transparent 1px, transparent 12px)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div
          className={`text-center mb-10 transition-all duration-500 ${
            isVisible || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {isBeta ? (
            <p className="text-xs uppercase tracking-[0.18em] text-primary-green font-semibold mb-3">Beta</p>
          ) : null}
          <span className="inline-flex items-center rounded-full border border-[#86efac] bg-[#dcfce7] px-4 py-1 text-[11px] font-bold tracking-[0.08em] text-[#166534] uppercase">
            Student Voices
          </span>
          <h2 className={`mt-4 font-heading text-3xl md:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            What Our Students Are Saying
          </h2>
          <div className="mx-auto mt-3 h-[3px] w-[60px] rounded bg-[linear-gradient(90deg,#16a34a,#4ade80)]" />
          <p className={`mt-4 text-lg max-w-3xl mx-auto ${isDark ? 'text-slate-300' : 'text-[#475569]'}`}>
            Real words from real CA students who are already using Preptio
          </p>
          {averageRating !== null ? (
            <div
              className={`mt-4 inline-flex flex-col items-center rounded-full px-5 md:px-6 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-500 ${
                isDark ? 'border border-white/20 bg-white/10' : 'border border-[#e2e8f0] bg-white'
              } ${
                isVisible || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '100ms' }}
            >
              <div className={`flex items-center gap-2 font-semibold text-sm md:text-base ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
                <RatingStars rating={averageRating} size={16} />
                <span>{averageRating.toFixed(1)} out of 5</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-[#64748b]'}`}>Based on {totalReviews} reviews</p>
            </div>
          ) : null}
        </div>

        {!useCarousel ? (
          <div className="flex flex-wrap justify-center gap-6">
            {reviews.map((review, index) => (
              <div key={review.id} className="w-full max-w-[500px]">
                <FeedbackCard
                  review={review}
                  isExpanded={expandedIds.includes(review.id)}
                  onToggleReadMore={toggleReadMore}
                  animateIn={isVisible || reduceMotion}
                  delayMs={100 + index * 100}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="hidden md:flex pointer-events-none absolute inset-y-0 left-0 right-0 items-center justify-between z-20">
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                className="pointer-events-auto -ml-5 h-11 w-11 rounded-full border border-[#e2e8f0] bg-white text-primary-green shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-primary-green hover:text-white hover:shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
                aria-label="Previous testimonials"
              >
                <ChevronLeft className="mx-auto" size={20} />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                className="pointer-events-auto -mr-5 h-11 w-11 rounded-full border border-[#e2e8f0] bg-white text-primary-green shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-primary-green hover:text-white hover:shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
                aria-label="Next testimonials"
              >
                <ChevronRight className="mx-auto" size={20} />
              </button>
            </div>

            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -ml-4 md:-ml-5">
                {reviews.map((review, index) => (
                  <div
                    key={review.id}
                    className="pl-4 md:pl-5 min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] xl:flex-[0_0_33.3333%]"
                  >
                    <FeedbackCard
                      review={review}
                      isExpanded={expandedIds.includes(review.id)}
                      onToggleReadMore={toggleReadMore}
                      animateIn={isVisible || reduceMotion}
                      delayMs={100 + (index % 3) * 100}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3 md:hidden">
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                className="h-9 w-9 rounded-full border border-[#e2e8f0] bg-white text-primary-green shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-primary-green hover:text-white"
                aria-label="Previous testimonials"
              >
                <ChevronLeft className="mx-auto" size={16} />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                className="h-9 w-9 rounded-full border border-[#e2e8f0] bg-white text-primary-green shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-primary-green hover:text-white"
                aria-label="Next testimonials"
              >
                <ChevronRight className="mx-auto" size={16} />
              </button>
            </div>

            {snapCount > 1 ? (
              <div className="mt-6 flex items-center justify-center gap-2">
                {Array.from({ length: snapCount }).map((_, index) => {
                  const isActive = index === selectedSnap
                  return (
                    <button
                      type="button"
                      key={`feedback-dot-${index}`}
                      onClick={() => emblaApi?.scrollTo(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isActive ? 'w-6 bg-primary-green' : 'w-2 bg-[#cbd5e1]'
                      }`}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
