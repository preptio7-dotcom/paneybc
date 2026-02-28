'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

const MAX_READ_MORE_LENGTH = 210
const AUTO_SCROLL_MS = 4000

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
}: {
  review: FeedbackReview
  isExpanded: boolean
  onToggleReadMore: (id: string) => void
}) {
  const hasLongMessage = review.message.length > MAX_READ_MORE_LENGTH
  const levelTag = review.user.level || 'CA Student'

  return (
    <article className="h-full rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {review.user.avatar ? (
            <img
              src={review.user.avatar}
              alt={review.user.name}
              className="h-11 w-11 rounded-full object-cover border border-slate-200 bg-slate-100"
              loading="lazy"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary-green text-white font-bold flex items-center justify-center">
              {getFirstInitial(review.user.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-text-dark truncate">{review.user.name || 'Student'}</p>
            <p className="text-xs text-text-light truncate">{review.user.city || 'Pakistan'}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[11px] border-primary-green/30 text-primary-green bg-primary-green/5">
          {levelTag}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {renderStars(review.rating)}
        <span className="text-xs font-semibold text-slate-600">{review.rating}/5</span>
      </div>

      <div className="mt-3 text-sm text-text-light leading-relaxed flex-1">
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

      <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-400">{formatDate(review.createdAt)}</p>
    </article>
  )
}

export function HomeFeedbackSection() {
  const [isLoading, setIsLoading] = useState(true)
  const [payload, setPayload] = useState<FeedbackPayload | null>(null)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [inView, setInView] = useState(false)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    dragFree: false,
  })
  const sectionRef = useRef<HTMLElement | null>(null)

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

    loadFeedback()
  }, [])

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    const fallbackTimer = window.setTimeout(() => {
      setInView(true)
    }, 1800)

    observer.observe(element)

    return () => {
      window.clearTimeout(fallbackTimer)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    const timer = window.setInterval(() => {
      emblaApi.scrollNext()
    }, AUTO_SCROLL_MS)

    return () => window.clearInterval(timer)
  }, [emblaApi])

  const reviews = useMemo(() => {
    if (!payload?.reviews) return []
    return payload.reviews.slice(0, 20)
  }, [payload])

  const sectionVisible = Boolean(payload?.sectionVisible && reviews.length > 0)
  const isBeta = payload?.visibility === 'beta_ambassador'
  const useCarousel = reviews.length >= 3

  const toggleReadMore = useCallback((id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [])

  if (isLoading || !sectionVisible) {
    return null
  }

  return (
    <section id="student-feedback" ref={sectionRef} className="w-full bg-background-light py-20">
      <div
        className={`max-w-6xl mx-auto px-6 transition-all duration-700 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="text-center mb-10">
          {isBeta ? (
            <p className="text-xs uppercase tracking-[0.18em] text-primary-green font-semibold mb-3">Beta</p>
          ) : null}
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-dark mb-3">
            {'\u{1F4AC} What Our Students Are Saying'}
          </h2>
          <p className="text-text-light text-lg max-w-3xl mx-auto">
            Real words from real CA students who are already using Preptio
          </p>
          {payload?.averageRating !== null ? (
            <p className="mt-4 text-sm md:text-base text-text-dark font-medium">
              {'\u2B50'} {payload.averageRating.toFixed(1)} out of 5 {'\u2014'} Based on {payload.totalReviews}{' '}
              reviews
            </p>
          ) : null}
        </div>

        {!useCarousel ? (
          <div className="flex flex-wrap justify-center gap-6">
            {reviews.map((review) => (
              <div key={review.id} className="w-full max-w-sm">
                <FeedbackCard
                  review={review}
                  isExpanded={expandedIds.includes(review.id)}
                  onToggleReadMore={toggleReadMore}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -ml-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="pl-4 min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.3333%]"
                  >
                    <FeedbackCard
                      review={review}
                      isExpanded={expandedIds.includes(review.id)}
                      onToggleReadMore={toggleReadMore}
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
