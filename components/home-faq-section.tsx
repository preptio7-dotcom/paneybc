'use client'

import { useEffect, useMemo, useState } from 'react'
import { FAQSection } from '@/components/faq-section'
import { faqData, type FaqItem } from '@/data/faq-data'
import { useAuth } from '@/lib/auth-context'
import {
  canAccessBetaFeature,
  extractBetaFeatureSettings,
  type BetaFeatureVisibility,
} from '@/lib/beta-features'

type HomeFaqState = {
  visibility: BetaFeatureVisibility
  items: FaqItem[]
}

const defaultFaqState: HomeFaqState = {
  visibility: 'beta_ambassador',
  items: faqData,
}

export function HomeFaqSection() {
  const { user, loading } = useAuth()
  const [faqState, setFaqState] = useState<HomeFaqState>(defaultFaqState)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadFaqSettings = async () => {
      try {
        const response = await fetch('/api/public/settings')
        if (!response.ok) return
        const data = await response.json()
        const testSettings = data?.testSettings || {}
        const faq = testSettings.faq || {}
        const betaFeatures = extractBetaFeatureSettings(testSettings)
        const hasFaqItemsArray = Array.isArray(faq.items)
        const normalizedItems = hasFaqItemsArray
          ? faq.items
              .map((item: any) => ({
                question: String(item?.question || '').trim(),
                answer: String(item?.answer || '').trim(),
              }))
              .filter((item: FaqItem) => item.question && item.answer)
          : faqData

        setFaqState({
          visibility: betaFeatures.faq,
          items: normalizedItems,
        })
      } catch {
        // keep defaults
      } finally {
        setIsLoaded(true)
      }
    }

    loadFaqSettings()
  }, [])

  const canAccessFaq = useMemo(
    () => canAccessBetaFeature(faqState.visibility, user?.studentRole),
    [faqState.visibility, user?.studentRole]
  )

  if (!isLoaded) {
    return null
  }

  if (!canAccessFaq) {
    return null
  }

  if (faqState.visibility !== 'public' && loading) {
    return null
  }

  const betaLabel = faqState.visibility === 'beta_ambassador' ? 'Beta' : undefined

  return (
    <FAQSection
      sectionId="frequently-asked-questions"
      items={faqState.items}
      betaLabel={betaLabel}
    />
  )
}
