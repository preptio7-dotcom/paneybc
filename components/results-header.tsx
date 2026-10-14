'use client'

import React from 'react'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import { CheckCircle, XCircle } from 'lucide-react'

interface ResultsHeaderProps {
  score: number
  totalQuestions: number
  percentage: number
  isPassed: boolean
  timeSpent: string
  subject: string
  date: string
}

export function ResultsHeader({
  score,
  totalQuestions,
  percentage,
  isPassed,
  timeSpent,
  subject,
  date
}: ResultsHeaderProps) {
  return (
    <div className="bg-background-light py-12 -mx-6 px-6 mb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header Info */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-text-dark mb-2">
            TEST COMPLETED - RESULTS
          </h1>
          <p className="text-text-light">
            {subject} | {date} | {timeSpent}
          </p>
        </div>

        {/* Score Display */}
        <div className="bg-white rounded-2xl p-8 border border-border mb-8">
          <div className="text-center mb-6">
            <p className="text-text-light text-lg mb-2">YOUR SCORE</p>
            <p className="font-heading text-5xl font-bold text-text-dark">
              {score} out of {totalQuestions}
            </p>
          </div>

          {/* Percentage */}
          <div className="text-center mb-8">
            <p className="font-heading text-6xl font-bold text-primary-green">
              {percentage}%
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={percentage} className="h-4" />
            <div className="flex justify-between text-xs text-text-light font-medium">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Pass/Fail Status */}
        <div
          className={`rounded-2xl p-8 border-2 text-center ${
            isPassed
              ? 'bg-green-50/50 border-success-green'
              : 'bg-red-50/50 border-error-red'
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            {isPassed ? (
              <>
                <CheckCircle size={32} className="text-success-green" />
                <p className="font-heading text-2xl font-bold text-success-green">
                  PASSED
                </p>
              </>
            ) : (
              <>
                <XCircle size={32} className="text-error-red" />
                <p className="font-heading text-2xl font-bold text-error-red">
                  FAILED
                </p>
              </>
            )}
          </div>

          <div className="space-y-2 text-text-light">
            <p>Passing Score Required: 15 (60%)</p>
            <p>Your Score: {score} ({percentage}%)</p>
            {isPassed ? (
              <p className="text-success-green font-medium">
                Difference: +{score - 15} answers above passing
              </p>
            ) : (
              <p className="text-error-red font-medium">
                You need {15 - score} more correct answers to pass
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
