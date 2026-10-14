'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ClipboardList,
  Flame,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type FeatureKey = 'custom_quiz' | 'streaks_badges' | 'mock_tests' | 'analytics'

type FeatureItem = {
  key: FeatureKey
  tabLabel: string
  tabIcon: LucideIcon
  badge: string
  badgeClassName: string
  heading: string
  description: string
  bullets: string[]
  ctaLabel: string
  ctaHref: string
}

const FEATURE_ITEMS: FeatureItem[] = [
  {
    key: 'custom_quiz',
    tabLabel: 'Custom Quiz',
    tabIcon: SlidersHorizontal,
    badge: 'MOST POWERFUL FEATURE',
    badgeClassName: 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/25',
    heading: 'Build Your Perfect Quiz',
    description:
      'You are in complete control. Choose your subjects, pick specific chapters, set difficulty level, and decide exactly how many questions you want. No other CA platform in Pakistan gives you this level of customization.',
    bullets: [
      'Choose any subject or chapter',
      'Set Easy, Medium or Hard difficulty',
      'Pick 10 to 100 questions',
      'Instant personalized test',
    ],
    ctaLabel: 'Build Your Quiz Free',
    ctaHref: '/custom-quiz',
  },
  {
    key: 'streaks_badges',
    tabLabel: 'Streaks & Badges',
    tabIcon: Flame,
    badge: 'STAY MOTIVATED',
    badgeClassName: 'bg-[#ea580c]/10 text-[#ea580c] border-[#ea580c]/25',
    heading: 'Build a Study Habit That Sticks',
    description:
      'Track your daily practice streak and earn milestone badges as you progress. Our gamification system turns exam prep into a rewarding daily habit because consistency is the secret to passing CA exams.',
    bullets: [
      'Daily streak counter',
      'Milestone badges (7, 14, 30, 100 days)',
      'Best streak tracking',
      '"Next badge in X days" hints',
    ],
    ctaLabel: 'Start Your Streak Today',
    ctaHref: '/auth/signup',
  },
  {
    key: 'mock_tests',
    tabLabel: 'Mock Tests',
    tabIcon: ClipboardList,
    badge: 'EXAM SIMULATION',
    badgeClassName: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/25',
    heading: 'Simulate the Real ICAP Exam Experience',
    description:
      'Practice under real exam conditions with our timed mock tests. Our BAE Mock Test replicates the Vol I to Vol II pattern reported by real ICAP students.',
    bullets: [
      'Timed exactly like real exam',
      'BAE Vol I + Vol II combined',
      'Randomized ratio each attempt',
      'Detailed results breakdown',
    ],
    ctaLabel: 'Try a Mock Test Free',
    ctaHref: '/practice/bae-mock',
  },
  {
    key: 'analytics',
    tabLabel: 'Analytics',
    tabIcon: BarChart2,
    badge: 'DATA-DRIVEN PREP',
    badgeClassName: 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/25',
    heading: 'Know Exactly Where You Stand',
    description:
      'Get deep insights into your performance with exam readiness score, chapter weakness heatmap, trend charts, and personalized recommendations.',
    bullets: [
      'Exam Readiness Score (0-100%)',
      'Accuracy trend over time',
      'Chapter weakness heatmap',
      'Personalized recommendations',
    ],
    ctaLabel: 'See Your Analytics',
    ctaHref: '/dashboard/analytics',
  },
]

function BrowserFrame({
  children,
  shouldAnimate,
}: {
  children: React.ReactNode
  shouldAnimate: boolean
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b] shadow-[0_25px_60px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] ${
        shouldAnimate ? 'feature-showcase-float feature-showcase-animated' : ''
      }`}
    >
      <div className="h-9 bg-[#334155] px-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
        <div className="ml-2 rounded-md bg-[#1e293b] px-3 py-1 text-[11px] text-slate-400 w-[190px]">
          preptio.com
        </div>
      </div>
      <div className="bg-white aspect-[16/10] relative overflow-hidden">{children}</div>
    </div>
  )
}

function CustomQuizMockup({ shouldAnimate }: { shouldAnimate: boolean }) {
  return (
    <BrowserFrame shouldAnimate={shouldAnimate}>
      <div className="h-full p-4 text-[12px] text-slate-700">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Select Subject</p>
          <div className="mt-2 space-y-2">
            <div className={`rounded-lg border border-slate-200 bg-white px-3 py-2 ${shouldAnimate ? 'feature-showcase-animated quiz-fade-step-1' : ''}`}>☑ Fundamentals of Accounting</div>
            <div className={`rounded-lg border border-slate-200 bg-white px-3 py-2 ${shouldAnimate ? 'feature-showcase-animated quiz-fade-step-2' : ''}`}>☑ BAE Vol I - ITB</div>
            <div className={`rounded-lg border border-slate-200 bg-white px-3 py-2 ${shouldAnimate ? 'feature-showcase-animated quiz-fade-step-3' : ''}`}>☐ QAFB</div>
          </div>
        </div>

        <div className={`mt-3 rounded-xl border border-slate-200 p-3 ${shouldAnimate ? 'feature-showcase-animated quiz-fade-step-4' : ''}`}>
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Select Chapters</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-green-100 text-green-700 px-2 py-1 text-[10px]">Chapter 1</span>
            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-1 text-[10px]">Chapter 2</span>
            <span className="rounded-full bg-green-100 text-green-700 px-2 py-1 text-[10px]">Chapter 3</span>
            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-1 text-[10px]">Chapter 5</span>
            <span className="rounded-full bg-green-100 text-green-700 px-2 py-1 text-[10px]">Chapter 7</span>
          </div>
        </div>

        <div className={`mt-3 rounded-xl border border-slate-200 p-3 ${shouldAnimate ? 'feature-showcase-animated quiz-fade-step-5' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Number of Questions</p>
            <span className="text-green-700 font-semibold">40 Questions</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full bg-green-500 ${shouldAnimate ? 'feature-showcase-animated quiz-slider-run' : 'w-[58%]'}`} />
          </div>
          <div className="mt-3 flex gap-1.5">
            <span className="rounded-md px-2 py-1 text-[10px] bg-slate-100 text-slate-600">Easy</span>
            <span className="rounded-md px-2 py-1 text-[10px] bg-green-600 text-white">Medium</span>
            <span className="rounded-md px-2 py-1 text-[10px] bg-slate-100 text-slate-600">Hard</span>
          </div>
        </div>

        <button
          className={`mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-white font-semibold ${
            shouldAnimate ? 'feature-showcase-animated quiz-button-pulse' : ''
          }`}
          type="button"
        >
          Build My Quiz →
        </button>
      </div>
    </BrowserFrame>
  )
}

function StreakBadgesMockup({ shouldAnimate }: { shouldAnimate: boolean }) {
  const [streak, setStreak] = useState(12)

  useEffect(() => {
    if (!shouldAnimate) {
      setStreak(12)
      return
    }

    setStreak(0)
    let value = 0
    const timer = window.setInterval(() => {
      value += 1
      if (value >= 12) {
        setStreak(12)
        window.clearInterval(timer)
        return
      }
      setStreak(value)
    }, 70)

    return () => window.clearInterval(timer)
  }, [shouldAnimate])

  return (
    <BrowserFrame shouldAnimate={shouldAnimate}>
      <div className="h-full p-4 bg-slate-50">
        <div className="rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <span className="text-3xl leading-none">🔥</span>
            <span className="text-xs text-white/80">Best: 15 days</span>
          </div>
          <p className="mt-3 text-4xl font-black">{streak}</p>
          <p className="text-xs text-white/80 uppercase tracking-wider">Day Streak</p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className={`h-10 w-10 rounded-full bg-orange-500 text-white grid place-items-center shadow ${shouldAnimate ? 'feature-showcase-animated badge-pop-1 badge-glow' : ''}`}>🔥</div>
          <div className={`h-10 w-10 rounded-full bg-blue-500 text-white grid place-items-center shadow ${shouldAnimate ? 'feature-showcase-animated badge-pop-2' : ''}`}>⚡</div>
          <div className={`h-10 w-10 rounded-full bg-slate-300 text-slate-500 grid place-items-center ${shouldAnimate ? 'feature-showcase-animated badge-pop-3' : ''}`}>🏆</div>
          <div className={`h-10 w-10 rounded-full bg-slate-300 text-slate-500 grid place-items-center ${shouldAnimate ? 'feature-showcase-animated badge-pop-4' : ''}`}>💎</div>
        </div>

        <div className={`mt-3 inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] text-green-700 font-medium ${shouldAnimate ? 'feature-showcase-animated badge-hint-in' : ''}`}>
          🔥 2 more days to earn Fortnight Fighter!
        </div>
      </div>
    </BrowserFrame>
  )
}

function formatTimer(totalSeconds: number) {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return [hrs, mins, secs].map((value) => String(value).padStart(2, '0')).join(':')
}

function MockTestMockup({ shouldAnimate }: { shouldAnimate: boolean }) {
  const [timerValue, setTimerValue] = useState(3765)

  useEffect(() => {
    if (!shouldAnimate) {
      setTimerValue(3765)
      return
    }

    let rafId = 0
    let previousTs = 0

    const tick = (timestamp: number) => {
      if (!previousTs) previousTs = timestamp
      if (timestamp - previousTs >= 1000) {
        previousTs = timestamp
        setTimerValue((current) => (current <= 0 ? 3765 : current - 1))
      }
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafId)
  }, [shouldAnimate])

  return (
    <BrowserFrame shouldAnimate={shouldAnimate}>
      <div className="h-full bg-slate-50 p-4 flex flex-col">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-900">BAE Mock Test</p>
            <span className="text-[11px] text-slate-500">Question 12 of 50</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-[24%] bg-green-500 rounded-full" />
          </div>
        </div>

        <div className={`mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${shouldAnimate ? 'feature-showcase-animated mock-question-shift' : ''}`}>
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Vol II - ECO
          </span>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Which of the following best describes price elasticity of demand?
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px]">A) The change in supply with fixed demand.</div>
            <div className={`rounded-lg border px-2.5 py-2 text-[11px] border-green-200 bg-green-50 text-green-700 ${shouldAnimate ? 'feature-showcase-animated mock-option-pick' : ''}`}>B) The responsiveness of demand to a change in price.</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px]">C) Total revenue produced by equilibrium price.</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px]">D) Marginal cost divided by output.</div>
          </div>
        </div>

        <div className="mt-auto rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-600">⏱ {formatTimer(timerValue)}</span>
          <button type="button" className={`rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white ${shouldAnimate ? 'feature-showcase-animated mock-next-pulse' : ''}`}>
            Save & Next →
          </button>
        </div>
      </div>
    </BrowserFrame>
  )
}

function AnalyticsMockup({ shouldAnimate }: { shouldAnimate: boolean }) {
  const targetReadiness = 73
  const [readiness, setReadiness] = useState(targetReadiness)

  useEffect(() => {
    if (!shouldAnimate) {
      setReadiness(targetReadiness)
      return
    }

    setReadiness(0)
    const duration = 2000
    const startedAt = performance.now()
    let rafId = 0

    const run = (timestamp: number) => {
      const elapsed = Math.min(duration, timestamp - startedAt)
      const progress = elapsed / duration
      const eased = 1 - Math.pow(1 - progress, 3)
      setReadiness(Math.round(targetReadiness * eased))
      if (elapsed < duration) {
        rafId = window.requestAnimationFrame(run)
      }
    }

    rafId = window.requestAnimationFrame(run)
    return () => window.cancelAnimationFrame(rafId)
  }, [shouldAnimate])

  const ringBackground = useMemo(
    () => `conic-gradient(#16a34a ${Math.min(100, readiness) * 3.6}deg, #e2e8f0 0deg)`,
    [readiness]
  )

  return (
    <BrowserFrame shouldAnimate={shouldAnimate}>
      <div className="h-full bg-slate-50 p-4">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 items-center">
          <div className="relative h-24 w-24 mx-auto">
            <div className="h-24 w-24 rounded-full p-2" style={{ background: ringBackground }}>
              <div className="h-full w-full rounded-full bg-white grid place-items-center">
                <div className="text-center">
                  <p className="text-xl font-black text-slate-900">{readiness}%</p>
                  <p className="text-[10px] text-slate-500">Exam Ready</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Accuracy Trend</p>
            <svg viewBox="0 0 180 70" className="mt-1 h-16 w-full">
              <path d="M5 58 L40 46 L75 42 L110 30 L145 22 L175 14" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" className={shouldAnimate ? 'feature-showcase-animated analytics-line-draw' : ''} />
            </svg>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <span className={`rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-700 ${shouldAnimate ? 'feature-showcase-animated analytics-pill-1' : ''}`}>FOA: 71% 🟢</span>
          <span className={`rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 ${shouldAnimate ? 'feature-showcase-animated analytics-pill-2' : ''}`}>BAEIVI: 68% 🟡</span>
          <span className={`rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-700 ${shouldAnimate ? 'feature-showcase-animated analytics-pill-3' : ''}`}>BAEIV2E: 74% 🟢</span>
          <span className={`rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-500 ${shouldAnimate ? 'feature-showcase-animated analytics-pill-4' : ''}`}>QAFB: --% ⬜</span>
        </div>

        <div className={`mt-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ${shouldAnimate ? 'feature-showcase-animated analytics-reco-in' : ''}`}>
          <p className="font-semibold">💡 Focus on Chapter 4 FOA</p>
          <p className="mt-0.5">Your accuracy is 42% — needs attention.</p>
          <p className="mt-1 font-semibold text-green-700">Practice Now →</p>
        </div>
      </div>
    </BrowserFrame>
  )
}

function renderFeatureMockup(key: FeatureKey, shouldAnimate: boolean) {
  if (key === 'custom_quiz') return <CustomQuizMockup shouldAnimate={shouldAnimate} />
  if (key === 'streaks_badges') return <StreakBadgesMockup shouldAnimate={shouldAnimate} />
  if (key === 'mock_tests') return <MockTestMockup shouldAnimate={shouldAnimate} />
  return <AnalyticsMockup shouldAnimate={shouldAnimate} />
}

export function HomeFeatureShowcaseSection({
  reduceMotion = false,
}: {
  reduceMotion?: boolean
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const touchStartXRef = useRef<number | null>(null)
  const timeoutRef = useRef<number[]>([])
  const [isVisible, setIsVisible] = useState(reduceMotion)
  const [isInView, setIsInView] = useState(reduceMotion)
  const [isHovered, setIsHovered] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const [progressCycleKey, setProgressCycleKey] = useState(0)

  useEffect(() => {
    if (reduceMotion) {
      setIsVisible(true)
      setIsInView(true)
      return
    }

    const element = sectionRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
          setIsInView(entry.isIntersecting)
        })
      },
      { threshold: 0.18 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [reduceMotion])

  useEffect(() => {
    return () => {
      timeoutRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timeoutRef.current = []
    }
  }, [])

  const switchToIndex = (nextIndex: number) => {
    const normalizedIndex = (nextIndex + FEATURE_ITEMS.length) % FEATURE_ITEMS.length
    if (normalizedIndex === activeIndex) return

    if (reduceMotion) {
      setActiveIndex(normalizedIndex)
      setProgressCycleKey((value) => value + 1)
      return
    }

    setPhase('out')
    const outTimer = window.setTimeout(() => {
      setActiveIndex(normalizedIndex)
      setProgressCycleKey((value) => value + 1)
      setPhase('in')
      const inTimer = window.setTimeout(() => {
        setPhase('idle')
      }, 350)
      timeoutRef.current.push(inTimer)
    }, 200)
    timeoutRef.current.push(outTimer)
  }

  const focusTabAtIndex = (index: number) => {
    const normalizedIndex = (index + FEATURE_ITEMS.length) % FEATURE_ITEMS.length
    const button = tabButtonRefs.current[normalizedIndex]
    if (button) button.focus()
  }

  const handleTabKeyDown = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      switchToIndex(index + 1)
      focusTabAtIndex(index + 1)
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      switchToIndex(index - 1)
      focusTabAtIndex(index - 1)
    }
  }

  useEffect(() => {
    if (reduceMotion || !isInView || isHovered) return
    const intervalId = window.setInterval(() => {
      switchToIndex(activeIndex + 1)
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [activeIndex, isHovered, isInView, reduceMotion])

  const activeFeature = FEATURE_ITEMS[activeIndex]
  const isContentLeft = activeIndex % 2 === 0
  const shouldPauseAnimation = reduceMotion || !isInView || isHovered

  const transitionClass = reduceMotion
    ? 'opacity-100 translate-x-0'
    : phase === 'out'
      ? 'opacity-0 -translate-x-5'
      : 'opacity-100 translate-x-0'

  return (
    <section
      ref={sectionRef}
      className={`w-full bg-[#f8fafc] py-[80px] ${
        shouldPauseAnimation ? 'feature-showcase-paused' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div
          className={`text-center transition-all duration-500 ${
            isVisible || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="inline-flex items-center rounded-full bg-[#dcfce7] border border-[#86efac] px-4 py-1 text-[12px] font-bold tracking-[0.06em] text-[#166534] uppercase">
            ✨ Platform Features
          </span>
          <h2 className="mt-4 font-heading text-[28px] md:text-[40px] font-extrabold text-[#0f172a]">
            See Preptio in Action
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-10 rounded bg-[#16a34a]" />
          <p className="mt-3 text-[14px] md:text-[16px] text-[#64748b] max-w-3xl mx-auto">
            Everything you need to prepare for your CA exams — beautifully designed and completely free.
          </p>
        </div>

        <div
          className={`mt-8 transition-all duration-500 ${
            isVisible || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '100ms' }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="tablist" aria-label="Preptio feature showcase tabs">
            {FEATURE_ITEMS.map((feature, index) => {
              const isActive = index === activeIndex
              const Icon = feature.tabIcon
              return (
                <button
                  key={feature.key}
                  type="button"
                  id={`feature-showcase-tab-${feature.key}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`feature-showcase-panel-${feature.key}`}
                  tabIndex={isActive ? 0 : -1}
                  ref={(element) => {
                    tabButtonRefs.current[index] = element
                  }}
                  onClick={() => switchToIndex(index)}
                  onKeyDown={(event) => handleTabKeyDown(index, event)}
                  className={`rounded-[14px] px-3 py-2.5 md:px-5 md:py-3 transition-all text-left ${
                    isActive
                      ? 'bg-white border-2 border-[#16a34a] shadow-[0_4px_14px_rgba(0,0,0,0.08)] text-[#0f172a] font-bold'
                      : 'bg-transparent border border-[#e2e8f0] text-[#64748b] font-medium hover:border-[#86efac] hover:text-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={18} />
                    <span className="text-[12px] md:text-[14px]">{feature.tabLabel}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className={`mt-10 transition-all duration-500 ${transitionClass}`}
          style={{ transitionDelay: '200ms' }}
          id={`feature-showcase-panel-${activeFeature.key}`}
          role="tabpanel"
          aria-labelledby={`feature-showcase-tab-${activeFeature.key}`}
          onTouchStart={(event) => {
            touchStartXRef.current = event.changedTouches[0]?.clientX ?? null
          }}
          onTouchEnd={(event) => {
            const startX = touchStartXRef.current
            const endX = event.changedTouches[0]?.clientX ?? null
            touchStartXRef.current = null
            if (startX === null || endX === null) return
            const deltaX = endX - startX
            if (Math.abs(deltaX) < 40) return
            if (deltaX < 0) {
              switchToIndex(activeIndex + 1)
            } else {
              switchToIndex(activeIndex - 1)
            }
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] gap-8 lg:gap-10 items-center">
            <div className={`order-1 ${isContentLeft ? 'lg:order-2' : 'lg:order-1'}`}>
              {renderFeatureMockup(activeFeature.key, !shouldPauseAnimation)}
            </div>

            <div className={`order-2 ${isContentLeft ? 'lg:order-1' : 'lg:order-2'}`}>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.04em] uppercase ${activeFeature.badgeClassName}`}
              >
                {activeFeature.badge}
              </span>
              <h3 className="mt-3 font-heading text-[24px] md:text-[32px] leading-tight font-extrabold text-[#0f172a]">
                {activeFeature.heading}
              </h3>
              <p className="mt-3 text-[14px] md:text-[15px] leading-[1.75] text-[#64748b]">
                {activeFeature.description}
              </p>
              <ul className="mt-4 space-y-2">
                {activeFeature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[13px] md:text-[14px] text-[#334155]">
                    <CheckCircle2 size={16} className="mt-[2px] shrink-0 text-[#16a34a]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <Link href={activeFeature.ctaHref} className="inline-flex w-full sm:w-auto mt-5">
                <Button className="w-full sm:w-auto bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl px-6 h-11">
                  {activeFeature.ctaLabel}
                  <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          {FEATURE_ITEMS.map((feature, index) => {
            const isActive = index === activeIndex
            return (
              <span key={feature.key} className="h-[3px] flex-1 rounded-full bg-[#e2e8f0] overflow-hidden">
                {isActive ? (
                  <span
                    key={`${feature.key}-${progressCycleKey}`}
                    className="block h-full rounded-full bg-[#16a34a] feature-showcase-progress-fill feature-showcase-animated"
                    style={{
                      animationDuration: reduceMotion ? '0s' : '5s',
                      animationPlayState: shouldPauseAnimation ? 'paused' : 'running',
                      width: reduceMotion ? '100%' : undefined,
                    }}
                  />
                ) : null}
              </span>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .feature-showcase-float {
          animation: mockupFloat 4s ease-in-out infinite;
        }
        .feature-showcase-progress-fill {
          animation: showcaseProgressFill linear forwards;
        }
        .quiz-fade-step-1 {
          animation: showcaseFadeInUp 0.4s ease forwards;
        }
        .quiz-fade-step-2 {
          opacity: 0;
          animation: showcaseFadeInUp 0.4s ease 0.25s forwards;
        }
        .quiz-fade-step-3 {
          opacity: 0;
          animation: showcaseFadeInUp 0.4s ease 0.5s forwards;
        }
        .quiz-fade-step-4 {
          opacity: 0;
          animation: showcaseFadeInUp 0.4s ease 0.85s forwards;
        }
        .quiz-fade-step-5 {
          opacity: 0;
          animation: showcaseFadeInUp 0.4s ease 1.1s forwards;
        }
        .quiz-slider-run {
          width: 20%;
          animation: quizSlider 3.2s ease-in-out infinite;
        }
        .quiz-button-pulse {
          animation: subtlePulse 1.6s ease-in-out 1.3s infinite;
        }
        .badge-pop-1 {
          animation: badgePop 0.45s ease-out;
        }
        .badge-pop-2 {
          opacity: 0;
          animation: badgePop 0.45s ease-out 0.2s forwards;
        }
        .badge-pop-3 {
          opacity: 0;
          animation: badgePop 0.45s ease-out 0.4s forwards;
        }
        .badge-pop-4 {
          opacity: 0;
          animation: badgePop 0.45s ease-out 0.55s forwards;
        }
        .badge-glow {
          animation: subtlePulse 1.7s ease-in-out infinite;
        }
        .badge-hint-in {
          opacity: 0;
          animation: showcaseFadeInUp 0.45s ease 0.6s forwards;
        }
        .mock-option-pick {
          animation: optionPick 4.2s ease-in-out infinite;
        }
        .mock-next-pulse {
          animation: subtlePulse 1.6s ease-in-out infinite;
        }
        .mock-question-shift {
          animation: questionShift 5s ease-in-out infinite;
        }
        .analytics-line-draw {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: lineDraw 1.5s ease forwards;
        }
        .analytics-pill-1 {
          animation: showcaseFadeInUp 0.3s ease 0.2s forwards;
          opacity: 0;
        }
        .analytics-pill-2 {
          animation: showcaseFadeInUp 0.3s ease 0.35s forwards;
          opacity: 0;
        }
        .analytics-pill-3 {
          animation: showcaseFadeInUp 0.3s ease 0.5s forwards;
          opacity: 0;
        }
        .analytics-pill-4 {
          animation: showcaseFadeInUp 0.3s ease 0.65s forwards;
          opacity: 0;
        }
        .analytics-reco-in {
          opacity: 0;
          animation: showcaseFadeInUp 0.4s ease 0.9s forwards;
        }
        .feature-showcase-paused :global(.feature-showcase-animated) {
          animation-play-state: paused !important;
        }
        @keyframes mockupFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes showcaseProgressFill {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        @keyframes showcaseFadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes subtlePulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }
        @keyframes badgePop {
          from {
            opacity: 0;
            transform: scale(0.75);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes optionPick {
          0%,
          60%,
          100% {
            box-shadow: none;
          }
          30% {
            box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.22);
          }
        }
        @keyframes questionShift {
          0%,
          78%,
          100% {
            transform: translateX(0);
            opacity: 1;
          }
          84% {
            transform: translateX(-10px);
            opacity: 0.85;
          }
          90% {
            transform: translateX(10px);
            opacity: 0;
          }
          96% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes lineDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes quizSlider {
          0%,
          100% {
            width: 20%;
          }
          50% {
            width: 58%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.feature-showcase-animated),
          :global(.feature-showcase-float) {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  )
}
