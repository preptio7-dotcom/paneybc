'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ArrowRight, BarChart2, BookOpen, UserPlus } from 'lucide-react'

type StepItem = {
  number: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

const STEPS: StepItem[] = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create Your Free Account',
    description:
      'Sign up in under 30 seconds - no credit card, no payment, completely free. Just your name and email.',
  },
  {
    number: '02',
    icon: BookOpen,
    title: 'Choose Your Subject & Practice',
    description:
      'Pick any of the 5 ICAP CA subjects, choose chapter-wise or full book practice, and dive straight into real exam-style questions.',
  },
  {
    number: '03',
    icon: BarChart2,
    title: 'Track Your Progress & Improve',
    description:
      'After every session see your score, accuracy, time taken, and weak areas. Study smarter every single day.',
  },
]

export function HowItWorksSection() {
  const stepRefs = useRef<Array<HTMLDivElement | null>>([])
  const [visibleSteps, setVisibleSteps] = useState<boolean[]>(() => STEPS.map(() => false))

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisibleSteps(STEPS.map(() => true))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const indexValue = Number(entry.target.getAttribute('data-step-index'))
          if (Number.isNaN(indexValue)) return
          setVisibleSteps((previous) => {
            if (previous[indexValue]) return previous
            const next = [...previous]
            next[indexValue] = true
            return next
          })
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.25 }
    )

    stepRefs.current.forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section className="w-full bg-background-light py-20">
      <div className="max-w-7xl mx-auto w-full px-6">
        <div className="text-center mb-14">
          <span className="inline-flex items-center rounded-full bg-primary-green/10 px-4 py-1 text-[11px] font-bold tracking-[0.08em] text-primary-green uppercase">
            Simple Process
          </span>
          <h2 className="mt-4 font-heading text-3xl md:text-4xl font-bold text-text-dark">
            Get Started in 3 Simple Steps
          </h2>
          <p className="mt-3 text-text-light text-lg max-w-2xl mx-auto">
            From signup to your first practice test in under 2 minutes
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-[14%] right-[14%] top-28 hidden xl:block border-t-2 border-dashed border-primary-green/25" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-6 relative z-10">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.number}>
                <div
                  ref={(element) => {
                    stepRefs.current[index] = element
                  }}
                  data-step-index={index}
                  className={`transition-all duration-700 ${
                    visibleSteps[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                  style={{ transitionDelay: `${index * 140}ms` }}
                >
                  <Card className="relative overflow-hidden border border-border bg-white shadow-sm transition-all duration-200 md:hover:-translate-y-1 md:hover:shadow-xl">
                    <span
                      aria-hidden
                      className="absolute right-4 top-2 text-7xl font-black leading-none text-[#dcfce7]"
                    >
                      {step.number}
                    </span>
                    <CardContent className="p-6 relative">
                      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] text-primary-green shadow-[0_4px_12px_rgba(34,197,94,0.15)]">
                        <step.icon size={28} className="text-primary-green" />
                      </div>
                      <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-primary-green uppercase">
                        Step {step.number}
                      </p>
                      <h3 className="font-heading text-xl font-semibold text-text-dark mb-3">{step.title}</h3>
                      <p className="text-text-light text-sm md:text-base leading-relaxed">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>

                {index < STEPS.length - 1 ? (
                  <div className="md:hidden flex justify-center text-primary-green/70 text-2xl font-bold leading-none">
                    ↓
                  </div>
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/auth/signup">
            <Button className="bg-primary-green hover:bg-primary-green/90 gap-2">
              Start Practicing Free
              <ArrowRight size={18} />
            </Button>
          </Link>
          <p className="mt-3 text-sm text-text-light">No credit card required. 100% free.</p>
        </div>
      </div>
    </section>
  )
}

