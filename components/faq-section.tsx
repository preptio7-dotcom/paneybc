'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FaqItem } from '@/data/faq-data'
import { ChevronDown } from 'lucide-react'
import { type HomepageThemeVariant } from '@/lib/homepage-theme'

type FAQSectionProps = {
  items: FaqItem[]
  betaLabel?: string
  sectionId?: string
  initialVisibleCount?: number
  showMoreLabel?: string
  showLessLabel?: string
  themeVariant?: HomepageThemeVariant
  reduceMotion?: boolean
}

function getFaqTheme(variant: HomepageThemeVariant) {
  if (variant === 'dark') {
    return {
      sectionClass: 'bg-[#0f172a]',
      headingClass: 'text-white',
      subtextClass: 'text-slate-300',
      itemTitleClass: 'text-white',
      itemBodyClass: 'text-slate-300',
      closedCardClass: 'border-white/15 bg-white/5',
      openCardClass: 'border-white/20 border-l-[3px] border-l-primary-green bg-white/10',
      iconClass: 'text-slate-300',
      toggleClass:
        'inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-primary-green hover:bg-white/10 transition-colors',
    }
  }

  if (variant === 'gray') {
    return {
      sectionClass: 'bg-[#f8fafc]',
      headingClass: 'text-text-dark',
      subtextClass: 'text-text-light',
      itemTitleClass: 'text-text-dark',
      itemBodyClass: 'text-text-light',
      closedCardClass:
        'border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)]',
      openCardClass: 'border-border border-l-[3px] border-l-primary-green bg-[#f0fdf4]',
      iconClass: 'text-text-light',
      toggleClass:
        'inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-primary-green hover:bg-slate-50 transition-colors',
    }
  }

  return {
    sectionClass: 'bg-white',
    headingClass: 'text-text-dark',
    subtextClass: 'text-text-light',
    itemTitleClass: 'text-text-dark',
    itemBodyClass: 'text-text-light',
    closedCardClass:
      'border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)]',
    openCardClass: 'border-border border-l-[3px] border-l-primary-green bg-[#f0fdf4]',
    iconClass: 'text-text-light',
    toggleClass:
      'inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-primary-green hover:bg-slate-50 transition-colors',
  }
}

export function FAQSection({
  items,
  betaLabel,
  sectionId = 'faq-section',
  initialVisibleCount = items.length,
  showMoreLabel = 'View More Questions',
  showLessLabel = 'Show Less Questions',
  themeVariant = 'light',
  reduceMotion = false,
}: FAQSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null)
  const [isVisible, setIsVisible] = useState(false)

  const visibleCount = Math.min(Math.max(initialVisibleCount, 1), items.length)
  const visibleItems = useMemo(
    () => (showAll ? items : items.slice(0, visibleCount)),
    [items, showAll, visibleCount]
  )
  const hasMoreItems = items.length > visibleCount

  useEffect(() => {
    if (!visibleItems.some((item) => item.id === openId)) {
      setOpenId(visibleItems[0]?.id || null)
    }
  }, [visibleItems, openId])

  useEffect(() => {
    if (reduceMotion) {
      setIsVisible(true)
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const element = document.getElementById(sectionId)
    if (!element) {
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
      { threshold: 0.1 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [sectionId, reduceMotion])

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  if (!items.length) {
    return null
  }

  const theme = getFaqTheme(themeVariant)

  return (
    <section id={sectionId} className={`w-full py-[48px] md:py-[72px] lg:py-[96px] ${theme.sectionClass}`}>
      <div className="max-w-4xl mx-auto px-6">
        <div
          className={`text-center mb-10 transition-all duration-500 ${
            isVisible || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-4 py-1 text-[11px] font-bold tracking-[0.08em] text-[#166534] uppercase">
            FAQ
          </span>
          {betaLabel ? (
            <p className="text-xs uppercase tracking-[0.18em] text-primary-green font-semibold mb-3">
              {betaLabel}
            </p>
          ) : null}
          <h2 className={`font-heading text-3xl md:text-4xl font-bold mb-3 ${theme.headingClass}`}>
            Frequently Asked Questions
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-10 rounded bg-primary-green" />
          <p className={`text-lg ${theme.subtextClass}`}>
            Everything you need to know before getting started
          </p>
        </div>

        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isOpen = openId === item.id

            return (
              <div
                key={item.id}
                className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                  isOpen ? theme.openCardClass : theme.closedCardClass
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className={`font-semibold pr-2 ${theme.itemTitleClass}`}>{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform ${theme.iconClass} ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>
                {isOpen ? (
                  <div className={`px-5 pb-5 leading-relaxed ${theme.itemBodyClass} ${themeVariant === 'dark' ? 'bg-white/10' : 'bg-[#f0fdf4]'}`}>
                    {item.answer}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        {hasMoreItems ? (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className={theme.toggleClass}
            >
              {showAll ? showLessLabel : showMoreLabel}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
