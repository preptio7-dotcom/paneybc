'use client'

import React from 'react'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { type HomepageThemeVariant } from '@/lib/homepage-theme'

function getCtaBackground(variant: HomepageThemeVariant) {
  if (variant === 'light') return 'bg-white'
  if (variant === 'gray') return 'bg-[#f8fafc]'
  return 'bg-[radial-gradient(ellipse_at_center,#22c55e_0%,#16a34a_100%)]'
}

export function CTABanner({ themeVariant = 'dark' }: { themeVariant?: HomepageThemeVariant }) {
  const router = useRouter()
  const { user } = useAuth()
  const isDark = themeVariant === 'dark'

  const handleStartClick = () => {
    if (user) {
      router.push('/dashboard')
      return
    }
    router.push('/auth/login')
  }

  return (
    <section className={`relative w-full overflow-hidden py-[48px] md:py-[72px] lg:py-[96px] ${getCtaBackground(themeVariant)}`}>
      <div className={`pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full blur-3xl ${isDark ? 'bg-white/10' : 'bg-primary-green/10'}`} />
      <div className={`pointer-events-none absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl ${isDark ? 'bg-white/10' : 'bg-primary-green/10'}`} />
      <div className={`pointer-events-none absolute left-1/3 bottom-0 h-56 w-56 rounded-full blur-3xl ${isDark ? 'bg-white/10' : 'bg-primary-green/10'}`} />

      <div className="relative max-w-7xl mx-auto w-full px-6 text-center">
        <span className={`inline-flex items-center rounded-full px-4 py-1 text-[11px] font-bold tracking-[0.08em] uppercase ${
          isDark ? 'bg-white/15 text-white' : 'bg-[#dcfce7] text-[#166534]'
        }`}>
          Get Started
        </span>
        <h2 className={`mt-4 font-heading text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-text-dark'}`}>
          Ready to Ace Your CA Exam?
        </h2>
        <div className={`mx-auto h-[3px] w-10 rounded ${isDark ? 'bg-white/70' : 'bg-primary-green'}`} />

        <p className={`text-lg mt-4 mb-8 max-w-2xl mx-auto ${isDark ? 'text-white/90' : 'text-text-light'}`}>
          Join thousands of successful students who have improved their scores with our platform
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className={`w-full sm:w-auto gap-2 ${
              isDark
                ? 'bg-white text-primary-green hover:bg-background-light'
                : 'bg-primary-green text-white hover:bg-primary-green/90'
            }`}
            onClick={handleStartClick}
          >
            Get Started Free
            <ArrowRight size={20} />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={`w-full sm:w-auto bg-transparent ${
              isDark
                ? 'border-white text-white hover:bg-white/10'
                : 'border-primary-green text-primary-green hover:bg-primary-green/5'
            }`}
            onClick={() => router.push('/demo')}
          >
            Try Demo
          </Button>
        </div>
      </div>
    </section>
  )
}
