import { Navigation } from '@/components/navigation'
import { HeroSection } from '@/components/hero-section'
import { FeaturesSection } from '@/components/features-section'
import { StatsSection } from '@/components/stats-section'
import { CTABanner } from '@/components/cta-banner'
import { Footer } from '@/components/footer'
import { HomeAdBanner } from '@/components/home-ad-banner'
import { LogoutToast } from '@/components/logout-toast'
import { Suspense } from 'react'

export default function Home() {
  return (
    <main className="w-full">
      <Navigation />
      <Suspense fallback={null}>
        <LogoutToast />
      </Suspense>
      <HeroSection />
      <HomeAdBanner />
      <FeaturesSection />
      <StatsSection />
      <CTABanner />
      <Footer />
    </main>
  )
}
