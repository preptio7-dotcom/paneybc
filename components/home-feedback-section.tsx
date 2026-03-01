'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type HomepageThemeVariant } from '@/lib/homepage-theme'

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

type FeedbackTheme = {
  sectionClass: string
  headingClass: string
  subtextClass: string
  cardClass: string
  dateClass: string
  messageClass: string
  nameClass: string
  cityClass: string
  ratingClass: string
  avatarBorderClass: string
}

const MAX_READ_MORE_LENGTH = 210
const AUTO_SCROLL_MS = 4000

function getFeedbackTheme(variant: HomepageThemeVariant): FeedbackTheme {
  if (variant === 'dark') {
    return {
      sectionClass: 'bg-[#0f172a]',
      headingClass: 'text-white',
      subtextClass: 'text-slate-300',
      cardClass:
        'border-white/15 bg-white/5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.20),0_8px_24px_rgba(0,0,0,0.25)] md:hover:border-primary-green/60 md:hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
      dateClass: 'text-slate-400',
      messageClass: 'text-slate-200',
      nameClass: 'text-white',
      cityClass: 'text-slate-300',
      ratingClass: 'text-slate-300',
      avatarBorderClass: 'border-white/20 bg-white/10',
    }
  }

  if (variant === 'gray') {
    return {
      sectionClass: 'bg-[#f8fafc]',
      headingClass: 'text-text-dark',
      subtextClass: 'text-text-light',
      cardClass:
        'border-border bg-white text-text-dark shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)] md:hover:border-[#86efac] md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
      dateClass: 'text-slate-400',
      messageClass: 'text-text-light',
      nameClass: 'text-text-dark',
      cityClass: 'text-text-light',
      ratingClass: 'text-slate-600',
      avatarBorderClass: 'border-slate-200 bg-slate-100',
    }
  }

  return {
    sectionClass: 'bg-white',
    headingClass: 'text-text-dark',
    subtextClass: 'text-text-light',
    cardClass:
      'border-border bg-white text-text-dark shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)] md:hover:border-[#86efac] md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
    dateClass: 'text-slate-400',
    messageClass: 'text-text-light',
    nameClass: 'text-text-dark',
    cityClass: 'text-text-light',
    ratingClass: 'text-slate-600',
    avatarBorderClass: 'border-slate-200 bg-slate-100',
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
}

function getFirstInitial(name: string) {
  const value = String(name || '').trim()
  if (!value) return 'S'
  return value.charAt(0).toUpperCase()
}

function renderStars(rating: number) {
  const safeRating = Math.min(Math.max(Number(rating) || 0, 0), 5)
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < safeRating
        return (
          <Star
            key={`star-${index}`}
            size={14}
            className={filled ? 'fill-primary-green text-primary-green' : 'text-slate-300'}
          />
        )
      })}
    </div>
  )
}

function FeedbackCard({
  review,
  isExpanded,
  onToggleReadMore,
  delayMs,
  animateIn,
  theme,
}: {
  review: FeedbackReview
  isExpanded: boolean
  onToggleReadMore: (id: string) => void
  delayMs: number
  animateIn: boolean
  theme: FeedbackTheme
}) {
  const hasLongMessage = review.message.length > MAX_READ_MORE_LENGTH
  const levelTag = review.user.level || 'CA Student'

  return (
    <article
      className={`relative h-full rounded-2xl border p-5 flex flex-col transition-all duration-200 md:hover:-translate-y-1 ${
        theme.cardClass
      } ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delayMs}ms`, minHeight: '220px' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-4 -top-[10px] text-[80px] leading-none text-[#dcfce7]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        &quot;
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {review.user.avatar ? (
            <Image
              src={review.user.avatar}
              alt={review.user.name}
              width={44}
              height={44}
              sizes="44px"
              className={`h-11 w-11 rounded-full object-cover border ${theme.avatarBorderClass}`}
              loading="lazy"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary-green text-white font-bold flex items-center justify-center">
              {getFirstInitial(review.user.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className={`font-semibold truncate ${theme.nameClass}`}>{review.user.name || 'Student'}</p>
            <p className={`text-xs truncate ${theme.cityClass}`}>{review.user.city || 'Pakistan'}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[11px] border-primary-green/30 text-primary-green bg-primary-green/5">
          {levelTag}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {renderStars(review.rating)}
        <span className={`text-xs font-semibold ${theme.ratingClass}`}>{review.rating}/5</span>
      </div>

      <div className={`mt-3 text-sm leading-relaxed flex-1 ${theme.messageClass}`}>
        <p className={isExpanded ? '' : 'line-clamp-3'}>{review.message}</p>
        {hasLongMessage ? (
          <button
            type="button"
            onClick={() => onToggleReadMore(review.id)}
            className="mt-1 text-xs font-semibold text-primary-green hover:underline"
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        ) : null}
      </div>

      <p className={`mt-4 text-[11px] uppercase tracking-wide ${theme.dateClass}`}>{formatDate(review.createdAt)}</p>
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
  const [isLoading, setIsLoading] = useState(true)
  const [payload, setPayload] = useState<FeedbackPayload | null>(null)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sectionNode, setSectionNode] = useState<HTMLElement | null>(null)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    dragFree: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    update()

    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const response = await fetch('/api/public/feedback', { cache: 'no-store' })
        if (!response.ok) {
          setPayload(null)
          return
        }

        const data = await response.json()
        if (data && typeof data === 'object') {
          setPayload(data)
        } else {
          setPayload(null)
        }
      } catch {
        setPayload(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadFeedback()
  }, [])

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

  useEffect(() => {
    if (!emblaApi || reduceMotion || isMobile) return

    const timer = window.setInterval(() => {
      emblaApi.scrollNext()
    }, AUTO_SCROLL_MS)

    return () => window.clearInterval(timer)
  }, [emblaApi, reduceMotion, isMobile])

  const reviews = useMemo(() => {
    if (!payload?.reviews) return []
    return payload.reviews.slice(0, 20)
  }, [payload])

  const sectionVisible = Boolean(payload?.sectionVisible && reviews.length > 0)
  const isBeta = payload?.visibility === 'beta_ambassador'
  const useCarousel = reviews.length >= 3 && !isMobile
  const theme = getFeedbackTheme(themeVariant)

  const toggleReadMore = useCallback((id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [])

  if (isLoading || !sectionVisible) {
    return null
  }

  return (
    <section
      id="student-feedback"
      ref={setSectionNode}
      className={`relative w-full overflow-hidden py-[64px] md:py-[84px] lg:py-[96px] ${theme.sectionClass}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(15,121,56,1) 0, rgba(15,121,56,1) 1px, transparent 1px, transparent 22px)',
        }}
      />
      <div className="max-w-6xl mx-auto px-6 transition-all duration-700 opacity-100 translate-y-0">
        <div
          className={`text-center mb-10 transition-all duration-500 ${
            isVisible || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {isBeta ? (
            <p className="text-xs uppercase tracking-[0.18em] text-primary-green font-semibold mb-3">Beta</p>
          ) : null}
          <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-4 py-1 text-[11px] font-bold tracking-[0.08em] text-[#166534] uppercase">
            Student Voices
          </span>
          <h2 className={`font-heading text-3xl md:text-4xl font-bold mb-3 ${theme.headingClass}`}>
            {'\u{1F4AC} What Our Students Are Saying'}
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-10 rounded bg-primary-green" />
          <p className={`text-lg max-w-3xl mx-auto ${theme.subtextClass}`}>
            Real words from real CA students who are already using Preptio
          </p>
          {payload?.averageRating !== null ? (
            <p className={`mt-4 text-sm md:text-base font-medium ${theme.headingClass}`}>
              {'\u2B50'} {payload.averageRating.toFixed(1)} out of 5
            </p>
          ) : null}
        </div>

        {!useCarousel ? (
          <div className="flex flex-wrap justify-center gap-6">
            {reviews.map((review, index) => (
              <div
                key={review.id}
                className={`w-full ${reviews.length <= 2 ? 'max-w-[600px]' : 'md:max-w-sm'}`}
              >
                <FeedbackCard
                  review={review}
                  isExpanded={expandedIds.includes(review.id)}
                  onToggleReadMore={toggleReadMore}
                  animateIn={isVisible || reduceMotion}
                  delayMs={Math.min(300, index * 100)}
                  theme={theme}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -ml-4">
                {reviews.map((review, index) => (
                  <div
                    key={review.id}
                    className="pl-4 min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.3333%]"
                  >
                    <FeedbackCard
                      review={review}
                      isExpanded={expandedIds.includes(review.id)}
                      onToggleReadMore={toggleReadMore}
                      animateIn={isVisible || reduceMotion}
                      delayMs={Math.min(300, index * 100)}
                      theme={theme}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-primary-green/30 text-primary-green hover:bg-primary-green/5"
                onClick={() => emblaApi?.scrollPrev()}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-primary-green/30 text-primary-green hover:bg-primary-green/5"
                onClick={() => emblaApi?.scrollNext()}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
