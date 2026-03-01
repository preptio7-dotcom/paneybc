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
  return 'bg-[linear-gradient(135deg,#16a34a_0%,#15803d_40%,#166534_100%)]'
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
      {isDark ? (
        <>
          <div className="pointer-events-none absolute left-[8%] top-[14%] h-20 w-20 rounded-full bg-white/5 cta-orb-slow" />
          <div className="pointer-events-none absolute right-[12%] top-[22%] h-28 w-28 rounded-full bg-white/5 cta-orb-reverse" />
          <div className="pointer-events-none absolute left-[18%] bottom-[16%] h-16 w-16 rounded-full bg-white/5 cta-orb-slow" />
          <div className="pointer-events-none absolute right-[24%] bottom-[10%] h-24 w-24 rounded-full bg-white/5 cta-orb-reverse" />
        </>
      ) : null}

      <div className="relative max-w-7xl mx-auto w-full px-6 text-center">
        <span className={`inline-flex items-center rounded-full px-4 py-1 text-[11px] font-bold tracking-[0.08em] uppercase ${
          isDark ? 'bg-white/15 text-white' : 'bg-[#dcfce7] text-[#166534]'
        }`}>
          Get Started
        </span>
        <h2
          className={`mt-4 font-heading text-3xl md:text-[2.5rem] font-extrabold mb-4 ${
            isDark ? 'text-white' : 'text-text-dark'
          }`}
          style={{ textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
        >
          Ready to Ace Your CA Exam?
        </h2>
        <div className={`mx-auto h-[3px] w-10 rounded ${isDark ? 'bg-white/70' : 'bg-primary-green'}`} />

        <p className={`text-lg mt-4 mb-8 max-w-2xl mx-auto ${isDark ? 'text-white/90' : 'text-text-light'}`}>
          Join thousands of successful students who have improved their scores with our platform
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className={`group relative overflow-hidden w-full sm:w-auto gap-2 ${
              isDark
                ? 'bg-white text-primary-green hover:bg-background-light'
                : 'bg-primary-green text-white hover:bg-primary-green/90'
            }`}
            onClick={handleStartClick}
          >
            <span className="relative z-[2] inline-flex items-center gap-2">
              Get Started Free
              <ArrowRight size={20} />
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-[70%] z-[1] w-[45%] rotate-12 bg-white/45 blur-sm transition-transform duration-500 group-hover:translate-x-[360%]"
            />
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
        <p className={`mt-4 text-[0.8rem] ${isDark ? 'text-white/75' : 'text-text-light'}`}>
          {'\u{1F512}'} No credit card required {'\u00B7'} 100% Free {'\u00B7'} Cancel anytime
        </p>
      </div>
      <style jsx>{`
        .cta-orb-slow {
          animation: cta-orb-rotate 42s linear infinite;
        }
        .cta-orb-reverse {
          animation: cta-orb-rotate-reverse 54s linear infinite;
        }
        @keyframes cta-orb-rotate {
          from {
            transform: rotate(0deg) translateX(0px);
          }
          50% {
            transform: rotate(180deg) translateX(8px);
          }
          to {
            transform: rotate(360deg) translateX(0px);
          }
        }
        @keyframes cta-orb-rotate-reverse {
          from {
            transform: rotate(360deg) translateX(0px);
          }
          50% {
            transform: rotate(180deg) translateX(-8px);
          }
          to {
            transform: rotate(0deg) translateX(0px);
          }
        }
      `}</style>
    </section>
  )
}
