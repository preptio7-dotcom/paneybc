'use client'

import React from 'react'
import { Card, CardContent } from './ui/card'
import { BookOpen, BarChart3, CheckCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface WelcomeSectionProps {
  statsData?: {
    totalTests: number
    averageAccuracy: number
    totalQuestionsPracticed: number
  }
  reviewDueCount?: number
}

export function WelcomeSection({ statsData, reviewDueCount = 0 }: WelcomeSectionProps) {
  const stats = [
    {
      icon: <BookOpen size={24} className="text-primary-green" />,
      label: 'Tests Taken',
      value: statsData?.totalTests.toString() || '0'
    },
    {
      icon: <BarChart3 size={24} className="text-accent-blue" />,
      label: 'Average Accuracy',
      value: `${statsData?.averageAccuracy || 0}%`
    },
    {
      icon: <CheckCircle size={24} className="text-success-green" />,
      label: 'Questions Practiced',
      value: statsData?.totalQuestionsPracticed.toString() || '0'
    },
    {
      icon: <BookOpen size={24} className="text-secondary-gold" />,
      label: 'Review Due',
      value: reviewDueCount.toString()
    }
  ]

  const getCurrentDate = () => {
    const date = new Date()
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="mb-12">
      <h2 className="font-heading text-3xl font-bold text-text-dark mb-2">
        Dashboard Overview
      </h2>
      <p className="text-text-light mb-6">
        {getCurrentDate()}
      </p>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-background-light rounded-lg">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-text-light text-sm">{stat.label}</p>
                  <p className="font-heading font-bold text-2xl text-text-dark">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
