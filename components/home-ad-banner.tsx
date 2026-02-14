'use client'

import React, { useEffect, useState } from 'react'
import { AdSlot } from '@/components/ad-slot'

export function HomeAdBanner() {
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [adContent, setAdContent] = useState<any>({
    dashboard: {
      headline: 'Level up your CA prep with expert-led notes',
      body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
      cta: 'Explore resources',
      href: '#',
    },
  })

  useEffect(() => {
    const loadSettings = async () => {
      const fallbackAds = {
        dashboard: {
          headline: 'Level up your CA prep with expert-led notes',
          body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
          cta: 'Explore resources',
          href: '#',
        },
      }

      try {
        const response = await fetch('/api/public/settings')
        if (!response.ok) {
          setAdsEnabled(false)
          setAdContent(fallbackAds)
          return
        }
        const data = await response.json()
        setAdsEnabled(Boolean(data.adsEnabled))
        setAdContent(data.adContent || fallbackAds)
      } catch (error) {
        setAdsEnabled(false)
        setAdContent(fallbackAds)
      } finally {
        setIsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  if (!isLoaded || !adsEnabled || !adContent?.dashboard) return null

  return (
    <div className="max-w-6xl mx-auto px-6 mt-8">
      <AdSlot
        placement="dashboard"
        headline={adContent.dashboard.headline}
        body={adContent.dashboard.body}
        cta={adContent.dashboard.cta}
        href={adContent.dashboard.href}
      />
    </div>
  )
}
