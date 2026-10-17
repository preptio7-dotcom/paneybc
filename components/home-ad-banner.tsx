'use client'

import React, { useEffect, useState } from 'react'
import { AdSlot } from '@/components/ad-slot'

interface HouseAdBannerProps {
  placement?: 'dashboard' | 'results' | 'community' | 'notes' | 'blog' | 'general' | string
  variant?: 'banner' | 'card' | 'sidebar'
  className?: string
}

let cachedSettings: any = null
let fetchPromise: Promise<any> | null = null

async function getSettings() {
  if (cachedSettings) return cachedSettings
  if (!fetchPromise) {
    fetchPromise = fetch('/api/public/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        cachedSettings = data
        return data
      })
      .catch(() => null)
      .finally(() => {
        fetchPromise = null
      })
  }
  return fetchPromise
}

export function HouseAdBanner({
  placement = 'dashboard',
  variant = 'banner',
  className = '',
}: HouseAdBannerProps) {
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [adContent, setAdContent] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    const fallbackAds = {
      dashboard: {
        headline: 'Level up your CA prep with expert-led notes',
        body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
        cta: 'Explore resources',
        href: '#',
      },
      results: {
        headline: 'Boost your score with targeted mock reviews',
        body: 'Short, focused revision plans built for CA students - improve accuracy before your next exam.',
        cta: 'See plans',
        href: '#',
      },
      community: {
        headline: 'Excel in your CA journey with verified mock exams',
        body: 'Practice with past papers, topic-wise tests, and expert verified solutions.',
        cta: 'Start Practicing',
        href: '/dashboard',
      },
      notes: {
        headline: 'Master complex concepts with high-yield study packs',
        body: 'Structured formula sheets and summary notes designed to save hours of revision.',
        cta: 'Get Study Packs',
        href: '/dashboard',
      },
    }

    getSettings().then((data) => {
      if (!mounted) return
      if (!data) {
        setAdsEnabled(false)
        setAdContent(fallbackAds)
      } else {
        setAdsEnabled(Boolean(data.adsEnabled))
        setAdContent(data.adContent || fallbackAds)
      }
      setIsLoaded(true)
    })

    return () => {
      mounted = false
    }
  }, [])

  if (!isLoaded || !adsEnabled || !adContent) return null

  const activeContent =
    adContent[placement] ||
    adContent.dashboard || {
      headline: 'Level up your CA prep with expert-led notes',
      body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
      cta: 'Explore resources',
      href: '#',
    }

  return (
    <div className={className || (variant === 'sidebar' || variant === 'card' ? 'w-full' : 'max-w-6xl mx-auto px-4 sm:px-6 my-6')}>
      <AdSlot
        placement={placement}
        headline={activeContent.headline}
        body={activeContent.body}
        cta={activeContent.cta}
        href={activeContent.href}
        variant={variant}
      />
    </div>
  )
}

// Retain HomeAdBanner for backward compatibility
export function HomeAdBanner() {
  return <HouseAdBanner placement="dashboard" className="max-w-6xl mx-auto px-6 mt-8 mb-8" />
}

