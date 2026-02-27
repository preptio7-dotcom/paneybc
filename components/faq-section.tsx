'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FaqItem } from '@/data/faq-data'
import { ChevronDown } from 'lucide-react'

type FAQSectionProps = {
  items: FaqItem[]
  betaLabel?: string
  sectionId?: string
  initialVisibleCount?: number
  showMoreLabel?: string
  showLessLabel?: string
}

export function FAQSection({
  items,
  betaLabel,
  sectionId = 'faq-section',
  initialVisibleCount = items.length,
  showMoreLabel = 'View More Questions',
  showLessLabel = 'Show Less Questions',
}: FAQSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null)

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

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  if (!items.length) {
    return null
  }

  return (
    <section id={sectionId} className="w-full bg-background-light py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          {betaLabel ? (
            <p className="text-xs uppercase tracking-[0.18em] text-primary-green font-semibold mb-3">
              {betaLabel}
            </p>
          ) : null}
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-dark mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-text-light text-lg">
            Everything you need to know before getting started
          </p>
        </div>

        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isOpen = openId === item.id

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-white shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-text-dark pr-2">{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-text-light transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>
                {isOpen ? (
                  <div className="px-5 pb-5 text-text-light leading-relaxed">
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
              className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-primary-green hover:bg-slate-50 transition-colors"
            >
              {showAll ? showLessLabel : showMoreLabel}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
