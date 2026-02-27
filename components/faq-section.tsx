'use client'

import { useState } from 'react'
import type { FaqItem } from '@/data/faq-data'
import { ChevronDown } from 'lucide-react'

type FAQSectionProps = {
  items: FaqItem[]
  betaLabel?: string
  sectionId?: string
}

export function FAQSection({ items, betaLabel, sectionId = 'faq-section' }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
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
          {items.map((item, index) => {
            const isOpen = openIndex === index

            return (
              <div
                key={item.question}
                className="rounded-xl border border-border bg-white shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
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
      </div>
    </section>
  )
}
