'use client'

import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function HeroSection() {
  const { user } = useAuth()
  const router = useRouter()
  const [questionStat, setQuestionStat] = useState('2000+')

  const handlePrimaryClick = () => {
    if (user) {
      router.push('/dashboard')
      return
    }
    router.push('/demo')
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
    <section className="w-full min-h-screen bg-gradient-to-b from-background-light to-white pt-[70px] flex items-center">
      <div className="max-w-7xl mx-auto w-full px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="flex flex-col gap-6">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-text-dark leading-tight text-balance">
              Master Your CA Exams with Confidence
            </h1>

            <p className="text-lg text-text-light leading-relaxed">
              Practice with {questionStat} real exam questions, take timed tests, and track your progress with our comprehensive CA practice platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="gap-2" onClick={handlePrimaryClick}>
                {user ? 'Start Practicing Now' : 'Try Demo'}
                <ArrowRight size={20} />
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push('/about')}>
                Learn More
              </Button>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full h-96 bg-gradient-to-br from-primary-green/10 to-secondary-gold/10 rounded-3xl flex items-center justify-center">
              <BookOpen size={120} className="text-primary-green opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
