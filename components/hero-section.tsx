'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from './ui/button'
import { ArrowRight, Check, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS,
  type HomepageHeroMotionSettings,
  type HomepageThemeVariant,
} from '@/lib/homepage-theme'

function getHeroBackground(variant: HomepageThemeVariant) {
  if (variant === 'dark') return 'bg-[#0f172a]'
  if (variant === 'gray') return 'bg-[#f8fafc]'
  return 'bg-[linear-gradient(90deg,#f0fdf4_0%,#ffffff_68%)]'
}

export function HeroSection({
  themeVariant = 'light',
  motionSettings = DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS,
  reduceMotion = false,
}: {
  themeVariant?: HomepageThemeVariant
  motionSettings?: HomepageHeroMotionSettings
  reduceMotion?: boolean
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [questionStat, setQuestionStat] = useState('4,000+')
  const [ratingStat, setRatingStat] = useState('4.8')
  const isDark = themeVariant === 'dark'

  const handlePrimaryClick = () => {
    if (user) {
      router.push('/dashboard')
      return
    }
    router.push('/auth/signup')
  }

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/public/stats')
        if (!response.ok) return
        const data = await response.json()
        const totalQuestions = Number(data.totalQuestions) || 0
        setQuestionStat(totalQuestions > 0 ? `${totalQuestions.toLocaleString()}+` : '4,000+')

        const avg = Number(data.averageRating)
        if (avg > 0) setRatingStat(avg.toFixed(1))
      } catch (error) {
        // keep default
      }
    }

    loadStats()
  }, [])

  const motionCssVars = {
    ['--hero-float-duration' as any]: `${motionSettings.floatDurationSeconds}s`,
    ['--hero-float-up-desktop' as any]: `-${motionSettings.floatDistanceDesktopPx}px`,
    ['--hero-float-up-mobile' as any]: `-${motionSettings.floatDistanceMobilePx}px`,
    ['--hero-badge-float-duration' as any]: `${motionSettings.badgeFloatDurationSeconds}s`,
    ['--hero-badge-float-distance' as any]: `${motionSettings.badgeFloatDistancePx}px`,
  } as React.CSSProperties

  return (
    <section
      className={`hero-section-root relative w-full overflow-hidden pt-[86px] pb-[48px] md:pb-[72px] lg:pb-[96px] ${getHeroBackground(
        themeVariant
      )} ${reduceMotion ? 'hero-reduce-motion' : ''}`}
      style={motionCssVars}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(#0f7938 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="relative max-w-7xl mx-auto w-full px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left Content */}
          <div className="hero-copy-enter flex flex-col gap-6">
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[13px] font-semibold md:text-sm ${isDark ? 'bg-white/15 text-white' : 'bg-primary-green/10 text-primary-green'
                }`}
            >
              {'\u{1F393} Built Exclusively for ICAP CA Students'}
            </span>

            <h1
              className={`font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance ${isDark ? 'text-white' : 'text-text-dark'
                }`}
            >
              Master Your CA Exams with{' '}
              <span className="relative inline-block text-primary-green">
                Confidence
                <span className="absolute left-0 -bottom-1 h-[6px] w-full rounded-full bg-primary-green/20" />
              </span>
            </h1>
            <div className="h-[3px] w-10 rounded bg-primary-green" />

            <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-text-light'}`}>
              Practice with {questionStat} real exam questions, take timed tests, and track your progress with our comprehensive CA practice platform.
            </p>

            <div className="hero-cta-row flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                className="hero-primary-btn gap-2 w-full sm:w-auto"
                onClick={handlePrimaryClick}
              >
                <span className="relative z-[2] inline-flex items-center gap-2">
                  {user ? 'Start Practicing Now' : 'Get Started Free'}
                  <ArrowRight size={20} />
                </span>
              </Button>
              {!user ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="hero-secondary-btn w-full sm:w-auto bg-transparent"
                  onClick={() => router.push('/demo')}
                >
                  Try Demo
                </Button>
              ) : null}
              <Button
                size="lg"
                variant="outline"
                className="hero-secondary-btn w-full sm:w-auto bg-transparent"
                asChild
              >
                <Link href="/#platform-features-showcase">See Features in Action</Link>
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-[10px] justify-center sm:justify-start">
              {[
                'Free to Use',
                `${questionStat} Questions`,
                'Built for ICAP',
              ].map((badgeText) => (
                <span
                  key={badgeText}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#86efac] bg-[rgba(220,252,231,0.8)] px-[14px] py-[6px] text-[13px] font-medium text-[#166534] transition-all duration-150 hover:bg-[rgba(220,252,231,0.95)] hover:border-[#4ade80] hover:-translate-y-[1px]"
                >
                  <CheckCircle size={14} className="text-[#16a34a]" />
                  {badgeText}
                </span>
              ))}
            </div>
          </div>

          {/* Right Preview */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="hero-card-enter relative w-full max-w-[560px]">
              <div className="hero-card-wrapper relative">
                <div className="hero-card-glow relative">
                  <div className="hero-card rounded-[24px] border border-black/10 bg-white shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_8px_24px_rgba(0,0,0,0.08),0_32px_64px_rgba(0,0,0,0.1)] overflow-hidden">
                    <div className="h-1 bg-[linear-gradient(90deg,#16a34a,#4ade80)]" />
                    <div className="p-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Question 4 of 10</p>
                        <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-[10px] py-[2px] text-[11px] font-semibold text-[#166534]">
                          Easy
                        </span>
                      </div>

                      <div className="pt-4">
                        <p className="mb-4 text-[14px] leading-[1.6] font-semibold text-[#0f172a]">
                          Which of the following is classified as a current asset?
                        </p>

                        <ul className="space-y-2 text-[13px]">
                          <li className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-[14px] py-[10px] text-slate-600">
                            {'\u25CB'} A. Land &amp; Buildings
                          </li>
                          <li className="flex items-center justify-between rounded-xl border-2 border-[#16a34a] bg-[#dcfce7] px-[14px] py-[10px] font-semibold text-[#166534]">
                            <span>{'\u25CB'} B. Trade Receivables</span>
                            <Check size={14} className="text-[#166534]" />
                          </li>
                          <li className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-[14px] py-[10px] text-slate-600">
                            {'\u25CB'} C. Long Term Loans
                          </li>
                          <li className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-[14px] py-[10px] text-slate-600">
                            {'\u25CB'} D. Goodwill
                          </li>
                        </ul>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className="text-xs font-medium text-slate-500">{'\u23F1'} 02:45</p>
                          <button
                            type="button"
                            className="rounded-lg bg-[#16a34a] px-[14px] py-[6px] text-xs font-semibold text-white"
                          >
                            Save &amp; Next {'\u2192'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-badge-float-1 absolute -top-5 right-2 rounded-full border border-[#e2e8f0] bg-white px-[14px] py-2 text-xs font-bold text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.1)] max-[480px]:hidden">
                {'\u2B50'} {ratingStat} Student Rating
              </div>
              <div className="hero-badge-float-2 absolute -bottom-5 left-2 rounded-full border border-[#e2e8f0] bg-white px-[14px] py-2 text-xs font-bold text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.1)] max-[480px]:hidden">
                {'\u{1F525}'} {questionStat} Questions
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent ${isDark ? 'to-black/30' : 'to-slate-200/35'
          }`}
      />
      <style jsx>{`
        .hero-copy-enter {
          animation: heroCopyEnter 0.6s ease-out both;
        }
        .hero-cta-row {
          margin-top: 32px;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .hero-primary-btn {
          position: relative;
          overflow: hidden;
          border: none;
          border-radius: 12px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #ffffff;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
          transition: all 200ms ease;
        }
        .hero-primary-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 25%, rgba(255, 255, 255, 0.35) 50%, transparent 75%);
          background-size: 220% 100%;
          animation: buttonShimmer 1.2s ease-out 0.3s 1;
          pointer-events: none;
          z-index: 1;
        }
        .hero-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(22, 163, 74, 0.45);
          background: linear-gradient(135deg, #15803d 0%, #166534 100%);
        }
        .hero-primary-btn:active {
          transform: translateY(0px);
          box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
        }
        .hero-secondary-btn {
          border: 2px solid #16a34a;
          border-radius: 12px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          color: #16a34a;
          background: transparent;
          transition: all 200ms ease;
        }
        .hero-secondary-btn:hover {
          background: rgba(22, 163, 74, 0.06);
          border-color: #15803d;
          transform: translateY(-2px);
        }
        .hero-card-enter {
          animation: heroCardEnter 0.7s ease-out 0.2s both;
        }
        .hero-card-wrapper {
          animation: heroFloat var(--hero-float-duration) ease-in-out 0.9s infinite;
          transform-origin: center;
          will-change: transform;
        }
        .hero-card {
          animation: cardGlow 3s ease-in-out infinite;
        }
        .hero-badge-float-1 {
          animation: heroBadgeEnter 0.5s ease-out 0.5s both, badgeFloat1 var(--hero-badge-float-duration) ease-in-out infinite 1.1s;
        }
        .hero-badge-float-2 {
          animation: heroBadgeEnter 0.5s ease-out 0.5s both, badgeFloat2 var(--hero-badge-float-duration) ease-in-out infinite 1.5s;
        }
        .hero-card-glow::before {
          content: '';
          position: absolute;
          inset: -14px;
          z-index: -1;
          background: radial-gradient(ellipse at center, rgba(34, 197, 94, 0.08) 0%, transparent 70%);
          filter: blur(30px);
        }
        @keyframes heroCopyEnter {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes heroCardEnter {
          from {
            opacity: 0;
            transform: translateX(28px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes heroBadgeEnter {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes buttonShimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        @keyframes heroFloat {
          0%,
          100% {
            transform: translateY(0px) rotate(-2deg);
          }
          50% {
            transform: translateY(var(--hero-float-up-desktop)) rotate(-2deg);
          }
        }
        @keyframes badgeFloat1 {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(var(--hero-badge-float-distance));
          }
        }
        @keyframes badgeFloat2 {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(var(--hero-badge-float-distance));
          }
        }
        @keyframes cardGlow {
          0%,
          100% {
            box-shadow:
              0 0 0 1px rgba(34, 197, 94, 0.08),
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 32px 64px rgba(0, 0, 0, 0.1),
              0 0 0 0 rgba(34, 197, 94, 0);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(34, 197, 94, 0.15),
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 32px 64px rgba(0, 0, 0, 0.1),
              0 0 20px 4px rgba(34, 197, 94, 0.12);
          }
        }
        @media (max-width: 767px) {
          .hero-card-enter {
            margin-top: 32px;
          }
          .hero-card-wrapper {
            width: 85%;
            max-width: 340px;
            margin: 0 auto;
            animation: heroFloatMobile var(--hero-float-duration) ease-in-out infinite;
            animation-duration: 6s;
            transform-origin: center;
          }
          .hero-primary-btn::after {
            animation: none;
          }
          .hero-card {
            animation: none;
          }
          .hero-card-glow::before {
            display: none;
          }
          .hero-badge-float-1,
          .hero-badge-float-2 {
            animation: none;
          }
          @keyframes heroFloatMobile {
            0%,
            100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(var(--hero-float-up-mobile)) rotate(0deg);
            }
          }
        }
        @media (min-width: 480px) and (max-width: 767px) {
          .hero-badge-float-1,
          .hero-badge-float-2 {
            font-size: 11px;
            padding: 5px 10px;
          }
        }
        @media (max-width: 479px) {
          .hero-badge-float-1,
          .hero-badge-float-2 {
            display: none;
          }
        }
        @media (max-width: 767px) {
          .hero-cta-row :global(button) {
            width: 100%;
          }
        }
        @media (max-width: 414px) {
          .hero-section-root {
            --hero-float-up-mobile: -6px;
            --hero-badge-float-distance: 5px;
          }
          .hero-card {
            box-shadow:
              0 0 0 1px rgba(34, 197, 94, 0.08),
              0 6px 16px rgba(0, 0, 0, 0.08),
              0 18px 36px rgba(0, 0, 0, 0.1);
          }
          .hero-copy-enter {
            animation-duration: 0.5s;
          }
          .hero-card-enter {
            animation-duration: 0.55s;
          }
        }
        @media (max-width: 375px) {
          .hero-section-root {
            --hero-float-up-mobile: -5px;
            --hero-badge-float-distance: 4px;
          }
          .hero-card-wrapper {
            width: 92%;
            max-width: 320px;
          }
          .hero-card {
            box-shadow:
              0 0 0 1px rgba(34, 197, 94, 0.08),
              0 4px 12px rgba(0, 0, 0, 0.08),
              0 14px 28px rgba(0, 0, 0, 0.1);
          }
        }
        .hero-reduce-motion .hero-copy-enter,
        .hero-reduce-motion .hero-card-enter,
        .hero-reduce-motion .hero-card-wrapper,
        .hero-reduce-motion .hero-card,
        .hero-reduce-motion .hero-primary-btn::after,
        .hero-reduce-motion .hero-badge-float-1,
        .hero-reduce-motion .hero-badge-float-2 {
          animation: none !important;
          transition: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-copy-enter,
          .hero-card-enter,
          .hero-card-wrapper,
          .hero-card,
          .hero-primary-btn::after,
          .hero-badge-float-1,
          .hero-badge-float-2 {
            animation: none !important;
            transition: none !important;
          }
          .hero-card-wrapper {
            transform: rotate(-2deg) !important;
          }
        }
        @media (prefers-reduced-motion: reduce) and (max-width: 767px) {
          .hero-card-wrapper {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  )
}
