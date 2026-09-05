'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { BookOpen, Clock, BarChart2 } from 'lucide-react'
import { type HomepageThemeVariant } from '@/lib/homepage-theme'

interface FeatureCard {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

function getSectionBackground(variant: HomepageThemeVariant) {
  if (variant === 'dark') return 'bg-[#0f172a] text-white'
  if (variant === 'gray') return 'bg-[#f8fafc]'
  return 'bg-white'
}

export function FeaturesSection({
  themeVariant = 'light',
  reduceMotion = false,
}: {
  themeVariant?: HomepageThemeVariant
  reduceMotion?: boolean
}) {
  const [questionStat, setQuestionStat] = useState('2000+')
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/public/stats')
        if (!response.ok) return
        const data = await response.json()
        const totalQuestions = Number(data.totalQuestions) || 0
        const rounded = totalQuestions >= 1000 ? Math.floor(totalQuestions / 1000) * 1000 : totalQuestions
        setQuestionStat(rounded > 0 ? `${rounded}+` : '2000+')
      } catch {
        // keep default
      }
    }

    loadStats()
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      setIsVisible(true)
      return
    }

    const element = sectionRef.current
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
      { threshold: 0.2 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [reduceMotion])

  const features: FeatureCard[] = [
    {
      icon: BookOpen,
      title: `${questionStat} Questions`,
      description: 'Comprehensive question bank covering all 5 CA subjects with real exam difficulty levels',
    },
    {
      icon: Clock,
      title: 'Real Exam Simulation',
      description: 'Take timed tests exactly like the real CA exam to build time management skills',
    },
    {
      icon: BarChart2,
      title: 'Instant Analytics',
      description: 'Track your progress and identify weak areas with detailed performance analytics',
    },
  ]

  const isDark = themeVariant === 'dark'

  return (
    <section
      ref={sectionRef}
      className={`w-full border-y border-slate-100 py-[48px] md:py-[72px] lg:py-[96px] ${getSectionBackground(
        themeVariant
      )}`}
    >
      <div className="max-w-7xl mx-auto w-full px-6">
        <div
          className={`text-center mb-12 transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-4 py-1 text-[11px] font-bold tracking-[0.08em] text-[#166534] uppercase">
            Why Preptio
          </span>
          <h2 className={`mt-4 font-heading text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-text-dark'}`}>
            Why Choose Our Platform?
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-10 rounded bg-primary-green" />
          <p className={`mt-4 text-lg ${isDark ? 'text-slate-300' : 'text-text-light'}`}>Everything you need to ace your CA exams</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
                className={`group cursor-pointer rounded-2xl border border-border border-l-4 border-l-transparent bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 md:hover:-translate-y-1 md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:hover:border-l-[#86efac] ${
                reduceMotion || isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] text-primary-green shadow-[0_4px_12px_rgba(34,197,94,0.15)]">
                  <feature.icon size={28} className="text-primary-green" />
                </div>
                <CardTitle className="text-xl font-heading">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-text-light text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
