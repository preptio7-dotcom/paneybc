'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { HeroSection } from '@/components/hero-section'
import { LazyHomeSection } from '@/components/lazy-home-section'
import {
  DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS,
  DEFAULT_HOMEPAGE_THEME_SETTINGS,
  extractHomepageHeroMotionSettings,
  extractHomepageThemeSettings,
  type HomepageHeroMotionSettings,
  type HomepageSectionThemeSettings,
} from '@/lib/homepage-theme'
import { useMotionGuard } from '@/lib/use-motion-guard'

const HomeAdBanner = dynamic(
  () => import('@/components/home-ad-banner').then((module) => module.HomeAdBanner),
  { ssr: false, loading: () => null }
)
const FeaturesSection = dynamic(
  () => import('@/components/features-section').then((module) => module.FeaturesSection),
  { ssr: false, loading: () => null }
)
const HowItWorksSection = dynamic(
  () => import('@/components/how-it-works-section').then((module) => module.HowItWorksSection),
  { ssr: false, loading: () => null }
)
const StatsSection = dynamic(
  () => import('@/components/stats-section').then((module) => module.StatsSection),
  { ssr: false, loading: () => null }
)
const CTABanner = dynamic(
  () => import('@/components/cta-banner').then((module) => module.CTABanner),
  { ssr: false, loading: () => null }
)
const HomeFeedbackSection = dynamic(
  () => import('@/components/home-feedback-section').then((module) => module.HomeFeedbackSection),
  { ssr: false, loading: () => null }
)
const HomeFaqSection = dynamic(
  () => import('@/components/home-faq-section').then((module) => module.HomeFaqSection),
  { ssr: false, loading: () => null }
)
const Footer = dynamic(() => import('@/components/footer').then((module) => module.Footer), {
  ssr: false,
  loading: () => null,
})

export function HomepageContent() {
  const [themes, setThemes] = useState<HomepageSectionThemeSettings>(DEFAULT_HOMEPAGE_THEME_SETTINGS)
  const [heroMotion, setHeroMotion] = useState<HomepageHeroMotionSettings>(
    DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS
  )
  const reduceMotion = useMotionGuard()

  useEffect(() => {
    let isMounted = true
    let channel: BroadcastChannel | null = null

    const loadThemes = async () => {
      try {
        const response = await fetch(`/api/public/settings?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!response.ok) return
        const data = await response.json()
        if (!isMounted) return
        const source = data?.testSettings || {}
        setThemes(extractHomepageThemeSettings(source))
        setHeroMotion(extractHomepageHeroMotionSettings(source))
      } catch {
        // keep defaults
      }
    }

    void loadThemes()

    const handleThemeRefresh = () => {
      void loadThemes()
    }

    try {
      channel = new BroadcastChannel('preptio-system-settings')
      channel.addEventListener('message', (event) => {
        if (event.data?.type === 'homepage-themes-updated') {
          void loadThemes()
        }
      })
    } catch {
      channel = null
    }

    window.addEventListener('preptio-homepage-themes-updated', handleThemeRefresh)
    window.addEventListener('focus', handleThemeRefresh)

    const timer = window.setInterval(() => {
      void loadThemes()
    }, 15_000)

    return () => {
      isMounted = false
      window.clearInterval(timer)
      window.removeEventListener('preptio-homepage-themes-updated', handleThemeRefresh)
      window.removeEventListener('focus', handleThemeRefresh)
      channel?.close()
    }
  }, [])

  const sectionConfig = useMemo(
    () => ({
      hero: themes.hero,
      whyChoose: themes.whyChoose,
      howItWorks: themes.howItWorks,
      stats: themes.stats,
      cta: themes.cta,
      feedback: themes.feedback,
      faq: themes.faq,
    }),
    [themes]
  )

  return (
    <>
      <HeroSection
        themeVariant={sectionConfig.hero}
        motionSettings={heroMotion}
        reduceMotion={reduceMotion}
      />
      <LazyHomeSection minHeight={520}>
        <StatsSection themeVariant={sectionConfig.stats} reduceMotion={reduceMotion} />
      </LazyHomeSection>
      <LazyHomeSection minHeight={620}>
        <FeaturesSection themeVariant={sectionConfig.whyChoose} reduceMotion={reduceMotion} />
      </LazyHomeSection>
      <LazyHomeSection minHeight={640}>
        <HowItWorksSection themeVariant={sectionConfig.howItWorks} reduceMotion={reduceMotion} />
      </LazyHomeSection>
      <LazyHomeSection minHeight={180}>
        <HomeAdBanner />
      </LazyHomeSection>
      <LazyHomeSection minHeight={620}>
        <HomeFeedbackSection themeVariant={sectionConfig.feedback} reduceMotion={reduceMotion} />
      </LazyHomeSection>
      <LazyHomeSection minHeight={420}>
        <CTABanner themeVariant={sectionConfig.cta} />
      </LazyHomeSection>
      <LazyHomeSection minHeight={560}>
        <HomeFaqSection themeVariant={sectionConfig.faq} reduceMotion={reduceMotion} />
      </LazyHomeSection>
      <LazyHomeSection minHeight={220}>
        <Footer />
      </LazyHomeSection>
    </>
  )
}
