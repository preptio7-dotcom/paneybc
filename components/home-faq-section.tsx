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
import { type HomepageThemeVariant } from '@/lib/homepage-theme'

type HomeFaqState = {
  visibility: BetaFeatureVisibility
  items: FaqItem[]
  featuredIds: string[]
}

const defaultFaqState: HomeFaqState = {
  visibility: 'beta_ambassador',
  items: faqData,
  featuredIds: faqData.slice(0, 5).map((item) => item.id),
}

export function HomeFaqSection({
  themeVariant = 'light',
  reduceMotion = false,
}: {
  themeVariant?: HomepageThemeVariant
  reduceMotion?: boolean
}) {
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
        const normalizedFeaturedIds = Array.isArray(faq.featuredIds)
          ? faq.featuredIds.map((id: any) => String(id || '').trim()).filter(Boolean)
          : []
        const normalizedItems = hasFaqItemsArray
          ? faq.items
              .map((item: any, index: number) => ({
                id: String(item?.id || '').trim() || `faq-item-${index + 1}`,
                question: String(item?.question || '').trim(),
                answer: String(item?.answer || '').trim(),
              }))
              .filter((item: FaqItem) => item.id && item.question && item.answer)
          : faqData

        const itemMap = new Map(normalizedItems.map((item) => [item.id, item]))
        const featured = normalizedFeaturedIds
          .map((id: string) => itemMap.get(id))
          .filter((item): item is FaqItem => Boolean(item))
        const featuredItems = featured.length ? featured : normalizedItems.slice(0, 5)
        const remainingItems = normalizedItems.filter(
          (item) => !featuredItems.some((featuredItem) => featuredItem.id === item.id)
        )

        setFaqState({
          visibility: betaFeatures.faq,
          items: [...featuredItems, ...remainingItems],
          featuredIds: featuredItems.map((item) => item.id),
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
      initialVisibleCount={Math.min(5, faqState.featuredIds.length || 5)}
      showMoreLabel="View More Questions"
      showLessLabel="Show Less Questions"
      themeVariant={themeVariant}
      reduceMotion={reduceMotion}
    />
  )
}
