'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

type FadeInSectionProps = {
  children: React.ReactNode
  className?: string
  delayMs?: number
}

type TimelineItem = {
  label: string
  icon: string
  text: string
}

type ValueItem = {
  icon: string
  title: string
  text: string
}

function FadeInSection({ children, className = '', delayMs = 0 }: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.18 }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  )
}

export default function AboutPage() {
  const { user } = useAuth()
  const [subjectCount, setSubjectCount] = useState('5')

  useEffect(() => {
    let active = true

    const loadPublicStats = async () => {
      try {
        const response = await fetch('/api/public/stats', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        const totalSubjects = Number(data?.totalSubjects)
        if (!active || Number.isNaN(totalSubjects) || totalSubjects < 0) return
        setSubjectCount(totalSubjects.toLocaleString())
      } catch {
        // keep fallback
      }
    }

    loadPublicStats()

    return () => {
      active = false
    }
  }, [])

  const timelineItems: TimelineItem[] = [
    {
      label: 'The Problem',
      icon: '\u{1F4A1}',
      text: 'CA students in Pakistan had no dedicated digital platform to practice exam questions efficiently. Resources were scattered, outdated, and hard to use.',
    },
    {
      label: 'The Idea',
      icon: '\u{1F680}',
      text: 'Preptio was born from a simple belief - every CA student deserves access to smart, structured, and free exam practice tools built specifically for ICAP.',
    },
    {
      label: 'Today',
      icon: '\u{1F393}',
      text: "We're building Pakistan's most comprehensive CA exam prep platform, starting with 4,000+ questions across all core subjects - and growing every day.",
    },
  ]

  const valueItems: ValueItem[] = [
    {
      icon: '\u{1F196}',
      title: 'Free for Everyone',
      text: 'We believe exam preparation should never be locked behind a paywall. Preptio is and will always be free for all CA students.',
    },
    {
      icon: '\u{1F3AF}',
      title: 'Built for ICAP',
      text: 'Every question, every feature, every update is designed specifically for ICAP CA students - not a generic platform adapted for Pakistan.',
    },
    {
      icon: '\u{1F4CA}',
      title: 'Data-Driven Learning',
      text: 'Our analytics help you understand exactly where you stand and what to focus on - so you study smarter, not just harder.',
    },
    {
      icon: '\u{1F331}',
      title: 'Always Improving',
      text: "We're a growing startup and proud of it. We ship updates regularly and listen to every student who gives us feedback.",
    },
  ]

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      <div className="pt-20 md:pt-24">
        {/* Section 1: Hero / Mission */}
        <section className="max-w-7xl mx-auto px-6 py-14 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <FadeInSection className="space-y-6 md:space-y-8 text-center lg:text-left">
              <div className="inline-block bg-primary-green/10 text-primary-green px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                OUR MISSION
              </div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black text-text-dark leading-[1.1]">
                Empowering the Next Generation of <span className="text-primary-green">Chartered Accountants</span>
              </h1>
              <p className="text-text-light text-lg md:text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Preptio was founded with a simple goal: to make professional exam preparation accessible, efficient, and
                data-driven. We provide the tools you need to master your curriculum.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-primary-green hover:bg-primary-green/90 h-12 px-8 text-base font-bold">
                    Start Your Journey
                  </Button>
                </Link>
                <Link href="/subjects" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 text-base font-bold bg-transparent border-primary-green text-primary-green hover:bg-primary-green/5"
                  >
                    Explore Subjects
                  </Button>
                </Link>
              </div>
            </FadeInSection>

            <FadeInSection className="flex items-center justify-center lg:justify-end" delayMs={100}>
              <div className="about-card-stack relative w-full max-w-md">
                <div className="relative z-30 rounded-2xl bg-white border border-slate-200 shadow-lg p-5 md:p-6">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-green/10 text-primary-green text-2xl">
                      {'\u{1F4DA}'}
                    </span>
                    <div>
                      <p className="text-3xl font-black text-slate-900">4,000+</p>
                      <p className="text-sm text-text-light">Practice Questions</p>
                    </div>
                  </div>
                </div>

                <div className="relative z-20 -mt-6 ml-6 md:ml-10 rounded-2xl bg-white border border-slate-200 shadow-lg p-5 md:p-6">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-green/10 text-primary-green text-2xl">
                      {'\u{1F3AF}'}
                    </span>
                    <div>
                      <p className="text-3xl font-black text-slate-900">{subjectCount}</p>
                      <p className="text-sm text-text-light">CA Subjects Covered</p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 -mt-6 ml-12 md:ml-20 rounded-2xl bg-white border border-slate-200 shadow-lg p-5 md:p-6">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-green/10 text-primary-green text-2xl">
                      {'\u26A1'}
                    </span>
                    <div>
                      <p className="text-3xl font-black text-slate-900">Free</p>
                      <p className="text-sm text-text-light">Always Free to Use</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Section 2: Our Story */}
        <section className="w-full bg-background-light py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              <div className="relative pl-8">
                <div className="absolute left-[13px] top-3 bottom-3 w-px bg-primary-green/25" />
                <div className="space-y-6">
                  {timelineItems.map((item, index) => (
                    <FadeInSection key={item.label} delayMs={index * 120}>
                      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                        <span className="absolute -left-[31px] top-6 h-3.5 w-3.5 rounded-full bg-primary-green ring-4 ring-primary-green/15" />
                        <p className="text-sm font-bold text-primary-green uppercase tracking-wide mb-2">
                          {item.icon} {item.label}
                        </p>
                        <p className="text-sm md:text-base text-text-light leading-relaxed">{item.text}</p>
                      </div>
                    </FadeInSection>
                  ))}
                </div>
              </div>

              <FadeInSection className="space-y-5" delayMs={120}>
                <span className="inline-flex items-center rounded-full bg-primary-green/10 text-primary-green px-4 py-1 text-xs font-black uppercase tracking-widest">
                  OUR STORY
                </span>
                <h2 className="font-heading text-3xl md:text-4xl font-black text-text-dark leading-tight">
                  Started With a Simple Belief
                </h2>
                <p className="text-text-light text-base md:text-lg leading-relaxed max-w-xl">
                  We knew CA students in Pakistan deserved better than scattered PDFs and outdated past papers. So we
                  built something better - for free.
                </p>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* Section 3: Our Values */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <FadeInSection className="text-center space-y-4 mb-10 md:mb-14">
            <span className="inline-flex items-center rounded-full bg-primary-green/10 text-primary-green px-4 py-1 text-xs font-black uppercase tracking-widest">
              WHAT WE STAND FOR
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-black text-text-dark">Our Core Values</h2>
            <p className="text-text-light text-base md:text-lg">Everything we build is guided by these principles</p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {valueItems.map((value, index) => (
              <FadeInSection key={value.title} delayMs={index * 110}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-green/10 text-primary-green text-2xl mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-text-dark mb-2">{value.title}</h3>
                  <p className="text-sm md:text-base text-text-light leading-relaxed">{value.text}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </section>

        {/* Section 4: CTA Banner */}
        {!user ? (
          <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-20">
            <FadeInSection>
              <div className="rounded-3xl bg-primary-green text-white py-10 px-6 md:py-12 md:px-10 text-center space-y-5 shadow-lg">
                <h2 className="font-heading text-3xl md:text-4xl font-black">Ready to Start Your CA Journey?</h2>
                <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto">
                  Join thousands of CA students already practicing smarter with Preptio. It's completely free.
                </p>
                <Link href="/auth/signup" className="inline-block">
                  <Button className="bg-white text-primary-green hover:bg-slate-100 font-bold h-12 px-8">
                    Create Free Account {'\u2192'}
                  </Button>
                </Link>
              </div>
            </FadeInSection>
          </section>
        ) : null}
      </div>

      <Footer />

      <style jsx>{`
        @keyframes about-float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .about-card-stack {
          animation: about-float 4s ease-in-out infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .about-card-stack {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  )
}
