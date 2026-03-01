'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Layers, Zap, Clock3, type LucideIcon } from 'lucide-react'
import { type HomepageThemeVariant } from '@/lib/homepage-theme'

type NumericStats = {
  totalQuestions: number
  totalSubjects: number
}

type StatItem =
  | {
      type: 'numeric'
      icon: LucideIcon
      value: number
      suffix: string
      label: string
    }
  | {
      type: 'static'
      icon: LucideIcon
      value: string
      label: string
    }

const FALLBACK_STATS: NumericStats = {
  totalQuestions: 4000,
  totalSubjects: 4,
}

const COUNT_ANIMATION_MS = 1500

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3)
}

function useCountUp(end: number, shouldAnimate: boolean) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!shouldAnimate) {
      setValue(end)
      return
    }

    let rafId = 0
    const startTime = performance.now()

    const step = (time: number) => {
      const elapsed = time - startTime
      const progress = Math.min(1, elapsed / COUNT_ANIMATION_MS)
      const eased = easeOutCubic(progress)
      setValue(Math.round(end * eased))
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step)
      }
    }

    rafId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(rafId)
  }, [end, shouldAnimate])

  return value
}

function NumericStatCard({
  icon: Icon,
  endValue,
  label,
  suffix = '',
  isVisible,
  animateCount,
  delayMs,
  darkMode,
}: {
  icon: LucideIcon
  endValue: number
  label: string
  suffix?: string
  isVisible: boolean
  animateCount: boolean
  delayMs: number
  darkMode: boolean
}) {
  const animatedValue = useCountUp(endValue, animateCount)

  return (
    <div
      className={`rounded-2xl border p-6 px-4 md:p-8 min-[1280px]:p-10 text-center transition-all duration-200 ease-out md:hover:-translate-y-[2px] ${
        darkMode
          ? 'rounded-2xl min-[1280px]:rounded-[20px] border-white/10 bg-white/[0.04] backdrop-blur-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.20),0_8px_24px_rgba(0,0,0,0.25)] md:hover:bg-white/[0.08] md:hover:border-[#4ade80]/30 md:hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
          : 'border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)] md:hover:border-[#86efac] md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="mb-4 inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-[#4ade80]/15">
        <Icon className="h-[18px] w-[18px] md:h-5 md:w-5 text-[#4ade80]" />
      </div>
      <p
        className="font-heading text-[2rem] md:text-[2.5rem] min-[1280px]:text-[3rem] leading-none font-extrabold text-[#4ade80] whitespace-nowrap"
        style={{ textShadow: darkMode ? '0 0 30px rgba(74,222,128,0.4)' : 'none' }}
      >
        {animatedValue.toLocaleString()}
        {suffix}
      </p>
      <p
        className={`mt-4 font-medium text-xs md:text-sm tracking-[0.05em] uppercase ${
          darkMode ? 'text-white/70' : 'text-text-light'
        }`}
      >
        {label}
      </p>
    </div>
  )
}

function StaticStatCard({
  icon: Icon,
  value,
  label,
  isVisible,
  delayMs,
  darkMode,
}: {
  icon: LucideIcon
  value: string
  label: string
  isVisible: boolean
  delayMs: number
  darkMode: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-6 px-4 md:p-8 min-[1280px]:p-10 text-center transition-all duration-200 ease-out md:hover:-translate-y-[2px] ${
        darkMode
          ? 'rounded-2xl min-[1280px]:rounded-[20px] border-white/10 bg-white/[0.04] backdrop-blur-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.20),0_8px_24px_rgba(0,0,0,0.25)] md:hover:bg-white/[0.08] md:hover:border-[#4ade80]/30 md:hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
          : 'border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)] md:hover:border-[#86efac] md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="mb-4 inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-[#4ade80]/15">
        <Icon className="h-[18px] w-[18px] md:h-5 md:w-5 text-[#4ade80]" />
      </div>
      <p
        className="font-heading text-[2rem] md:text-[2.5rem] min-[1280px]:text-[3rem] leading-none font-extrabold text-[#4ade80] whitespace-nowrap"
        style={{ textShadow: darkMode ? '0 0 30px rgba(74,222,128,0.4)' : 'none' }}
      >
        {value}
      </p>
      <p
        className={`mt-4 font-medium text-xs md:text-sm tracking-[0.05em] uppercase ${
          darkMode ? 'text-white/70' : 'text-text-light'
        }`}
      >
        {label}
      </p>
    </div>
  )
}

function getStatsSectionTheme(variant: HomepageThemeVariant) {
  if (variant === 'dark') {
    return {
      sectionClass:
        'border-t border-[rgba(255,255,255,0.06)] bg-[linear-gradient(135deg,#0f172a_0%,#0d2137_50%,#0f172a_100%)]',
      headingClass: 'text-white',
      subtextClass: 'text-slate-300',
      darkMode: true,
    }
  }

  if (variant === 'gray') {
    return {
      sectionClass: 'bg-[#f8fafc]',
      headingClass: 'text-text-dark',
      subtextClass: 'text-text-light',
      darkMode: false,
    }
  }

  return {
    sectionClass: 'bg-white',
    headingClass: 'text-text-dark',
    subtextClass: 'text-text-light',
    darkMode: false,
  }
}

export function StatsSection({
  themeVariant = 'dark',
  reduceMotion = false,
}: {
  themeVariant?: HomepageThemeVariant
  reduceMotion?: boolean
}) {
  const [stats, setStats] = useState<NumericStats>(FALLBACK_STATS)
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats', { cache: 'no-store' })
        if (!response.ok) {
          setStats(FALLBACK_STATS)
          return
        }
        const data = await response.json()
        const totalQuestions = Math.max(0, Number(data?.totalQuestions) || 0)
        const totalSubjects = Math.max(0, Number(data?.totalSubjects) || 0)

        setStats({
          totalQuestions: totalQuestions > 0 ? totalQuestions : FALLBACK_STATS.totalQuestions,
          totalSubjects: totalSubjects > 0 ? totalSubjects : FALLBACK_STATS.totalSubjects,
        })
      } catch {
        setStats(FALLBACK_STATS)
      }
    }

    void loadStats()
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      setIsInView(true)
      return
    }

    const element = sectionRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [reduceMotion])

  const renderedStats = useMemo<StatItem[]>(
    () => [
      {
        type: 'numeric',
        icon: BookOpen,
        value: stats.totalQuestions,
        suffix: '+',
        label: 'Questions Available',
      },
      {
        type: 'numeric',
        icon: Layers,
        value: stats.totalSubjects,
        suffix: '',
        label: 'Subjects Covered',
      },
      {
        type: 'static',
        icon: Zap,
        value: 'Free',
        label: 'Always Free to Use',
      },
      {
        type: 'static',
        icon: Clock3,
        value: '24/7',
        label: 'Practice Anytime',
      },
    ],
    [stats.totalQuestions, stats.totalSubjects]
  )

  const theme = getStatsSectionTheme(themeVariant)

  return (
    <section
      ref={sectionRef}
      className={`relative w-full overflow-hidden py-[48px] md:py-[72px] lg:py-[96px] ${theme.sectionClass}`}
    >
      {theme.darkMode ? (
        <>
          <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#22c55e]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#4ade80]/10 blur-3xl" />
        </>
      ) : null}
      <div className="max-w-7xl mx-auto w-full px-6">
        <div
          className={`text-center mb-12 transition-all duration-500 ${
            isInView || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-4 py-1 text-[11px] font-bold tracking-[0.08em] text-[#166534] uppercase">
            Platform Snapshot
          </span>
          <h2 className={`font-heading text-3xl md:text-4xl font-bold mt-4 ${theme.headingClass}`}>
            Built for ICAP Students, by People Who Understand the Exam
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-10 rounded bg-primary-green" />
          <p className={`mt-4 text-lg ${theme.subtextClass}`}>
            We&apos;re a new platform and proud of it - growing fast with students who want a smarter way to prepare.
          </p>
        </div>

        <div className="grid max-[374px]:grid-cols-1 grid-cols-2 min-[1280px]:grid-cols-4 gap-3 md:gap-4 min-[1280px]:gap-6">
          {renderedStats.map((stat, index) =>
            stat.type === 'numeric' ? (
              <NumericStatCard
                key={stat.label}
                icon={stat.icon}
                endValue={stat.value}
                suffix={stat.suffix}
                label={stat.label}
                isVisible={isInView || reduceMotion}
                animateCount={isInView && !reduceMotion}
                delayMs={index * 100}
                darkMode={theme.darkMode}
              />
            ) : (
              <StaticStatCard
                key={stat.label}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
                isVisible={isInView || reduceMotion}
                delayMs={index * 100}
                darkMode={theme.darkMode}
              />
            )
          )}
        </div>
      </div>
    </section>
  )
}
