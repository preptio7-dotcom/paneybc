'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { BookOpen, Clock, BarChart2 } from 'lucide-react'

interface FeatureCard {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export function FeaturesSection() {
  const [questionStat, setQuestionStat] = useState('2000+')

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

  const features: FeatureCard[] = [
    {
      icon: BookOpen,
      title: `${questionStat} Questions`,
      description: 'Comprehensive question bank covering all 5 CA subjects with real exam difficulty levels'
    },
    {
      icon: Clock,
      title: 'Real Exam Simulation',
      description: 'Take timed tests exactly like the real CA exam to build time management skills'
    },
    {
      icon: BarChart2,
      title: 'Instant Analytics',
      description: 'Track your progress and identify weak areas with detailed performance analytics'
    }
  ]

  return (
    <section className="w-full bg-white py-20">
      <div className="max-w-7xl mx-auto w-full px-6">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-dark mb-4">
            Why Choose Our Platform?
          </h2>
          <p className="text-text-light text-lg">
            Everything you need to ace your CA exams
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group cursor-pointer border border-border border-l-4 border-l-transparent transition-all duration-200 md:hover:-translate-y-1 md:hover:shadow-xl md:hover:border-l-primary-green"
            >
              <CardHeader>
                <div
                  className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] text-primary-green transition-all duration-200 md:group-hover:shadow-[0_4px_12px_rgba(34,197,94,0.15)]"
                >
                  <feature.icon size={28} className="text-primary-green" />
                </div>
                <CardTitle className="text-xl font-heading">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-text-light text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
