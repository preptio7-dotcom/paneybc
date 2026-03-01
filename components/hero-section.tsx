'use client'

import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { type HomepageThemeVariant } from '@/lib/homepage-theme'

function getHeroBackground(variant: HomepageThemeVariant) {
  if (variant === 'dark') return 'bg-[#0f172a]'
  if (variant === 'gray') return 'bg-[#f8fafc]'
  return 'bg-[linear-gradient(90deg,#f0fdf4_0%,#ffffff_68%)]'
}

export function HeroSection({ themeVariant = 'light' }: { themeVariant?: HomepageThemeVariant }) {
  const { user } = useAuth()
  const router = useRouter()
  const [questionStat, setQuestionStat] = useState('2000+')
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
        const rounded = totalQuestions >= 1000
          ? Math.floor(totalQuestions / 1000) * 1000
          : totalQuestions
        setQuestionStat(rounded > 0 ? `${rounded}+` : '2000+')
      } catch (error) {
        // keep default
      }
    }

    loadStats()
  }, [])

  return (
    <section
      className={`relative w-full overflow-hidden pt-[86px] pb-[48px] md:pb-[72px] lg:pb-[96px] ${getHeroBackground(
        themeVariant
      )}`}
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
          <div className="flex flex-col gap-6">
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[13px] font-semibold md:text-sm ${
                isDark ? 'bg-white/15 text-white' : 'bg-primary-green/10 text-primary-green'
              }`}
            >
              {'\u{1F393} Built Exclusively for ICAP CA Students'}
            </span>

            <h1
              className={`font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance ${
                isDark ? 'text-white' : 'text-text-dark'
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

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={handlePrimaryClick}>
                {user ? 'Start Practicing Now' : 'Get Started Free'}
                <ArrowRight size={20} />
              </Button>
              {!user ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-primary-green text-primary-green hover:bg-primary-green/5 bg-transparent"
                  onClick={() => router.push('/demo')}
                >
                  Try Demo
                </Button>
              ) : null}
            </div>

            <p
              className={`text-[13px] leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1 ${
                isDark ? 'text-slate-300' : 'text-text-light'
              }`}
            >
              <span>{'\u2705'} Free to Use</span>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>|</span>
              <span>{'\u2705'} {questionStat} Questions</span>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>|</span>
              <span>{'\u2705'} Built for ICAP</span>
            </p>
          </div>

          {/* Right Preview */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[560px] scale-[0.8] sm:scale-100 origin-top">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-5 md:p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Question 4 of 10</p>
                  <span className="inline-flex items-center rounded-full bg-primary-green/10 px-2.5 py-1 text-xs font-semibold text-primary-green">
                    {'\u25CF'} Easy
                  </span>
                </div>

                <div className="pt-4 space-y-4">
                  <p className="text-base md:text-lg font-semibold text-text-dark leading-snug">
                    Which of the following is classified as a current asset?
                  </p>

                  <ul className="space-y-2 text-sm md:text-[15px]">
                    <li className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600">
                      {'\u25CB'} A. Land &amp; Buildings
                    </li>
                    <li className="rounded-lg border border-primary-green/40 bg-primary-green/10 px-3 py-2 text-primary-green font-semibold">
                      {'\u2705'} B. Trade Receivables
                    </li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600">
                      {'\u25CB'} C. Long Term Loans
                    </li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600">
                      {'\u25CB'} D. Goodwill
                    </li>
                  </ul>

                  <div className="flex items-center justify-between text-sm">
                    <p className="font-medium text-slate-500">{'\u23F1'} 02:45 remaining</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                    >
                      {'\u2190'} Back
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-primary-green px-4 py-2 text-sm font-semibold text-white shadow-sm"
                    >
                      Save &amp; Next {'\u2192'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="absolute -top-5 right-2 rounded-full border border-primary-green/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary-green shadow-md max-[480px]:hidden">
                {'\u2B50'} 4.8 Student Rating
              </div>
              <div className="absolute -bottom-5 left-2 rounded-full border border-primary-green/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary-green shadow-md max-[480px]:hidden">
                {'\u{1F525}'} 4,000+ Questions
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent ${
          isDark ? 'to-black/30' : 'to-slate-200/35'
        }`}
      />
    </section>
  )
}
