'use client'

import React from 'react'
import { Card, CardContent } from './ui/card'
import { CheckCircle, XCircle, HelpCircle, BarChart3 } from 'lucide-react'

interface PerformanceSummaryProps {
  correctAnswers: number
  wrongAnswers: number
  notAttempted: number
  accuracy: number
}

export function PerformanceSummary({
  correctAnswers,
  wrongAnswers,
  notAttempted,
  accuracy
}: PerformanceSummaryProps) {
  const stats = [
    {
      number: correctAnswers,
      label: 'Correct Answers',
      icon: <CheckCircle size={32} className="text-success-green" />,
      bgColor: 'bg-green-50/50'
    },
    {
      number: wrongAnswers,
      label: 'Wrong Answers',
      icon: <XCircle size={32} className="text-error-red" />,
      bgColor: 'bg-red-50/50'
    },
    {
      number: notAttempted,
      label: 'Not Attempted',
      icon: <HelpCircle size={32} className="text-accent-blue" />,
      bgColor: 'bg-blue-50/50'
    },
    {
      number: `${accuracy}%`,
      label: 'Accuracy',
      icon: <BarChart3 size={32} className="text-primary-green" />,
      bgColor: 'bg-green-50/50'
    }
  ]

  return (
    <div className="mb-12">
      <h2 className="font-heading text-2xl font-bold text-text-dark mb-6">
        PERFORMANCE SUMMARY
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className={`border border-border ${stat.bgColor}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-3 flex justify-center">
                  {stat.icon}
                </div>
                <p className="font-heading text-3xl font-bold text-text-dark mb-2">
                  {stat.number}
                </p>
                <p className="text-text-light text-sm">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
