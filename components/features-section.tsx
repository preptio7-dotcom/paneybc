'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { BookOpen, Clock, BarChart3 } from 'lucide-react'

interface FeatureCard {
  icon: React.ReactNode
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
      icon: <BookOpen size={60} />,
      title: `${questionStat} Questions`,
      description: 'Comprehensive question bank covering all 5 CA subjects with real exam difficulty levels'
    },
    {
      icon: <Clock size={60} />,
      title: 'Real Exam Simulation',
      description: 'Take timed tests exactly like the real CA exam to build time management skills'
    },
    {
      icon: <BarChart3 size={60} />,
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
              className="border border-border hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
            >
              <CardHeader>
                <div className="mb-4 text-primary-green group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
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
