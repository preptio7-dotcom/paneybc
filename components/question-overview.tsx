'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestionOverviewProps {
  totalQuestions: number
  answeredQuestions: Set<number>
  currentQuestion: number
  onQuestionSelect: (questionNumber: number) => void
}

export function QuestionOverview({
  totalQuestions,
  answeredQuestions,
  currentQuestion,
  onQuestionSelect
}: QuestionOverviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Create a grid of 5 columns
  const questionsGrid = []
  for (let i = 0; i < totalQuestions; i++) {
    questionsGrid.push(i + 1)
  }

  return (
    <div className="hidden lg:block lg:w-56">
      <Card className="border border-border sticky top-[60px] h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-heading">
              Question Overview
            </CardTitle>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-background-light rounded transition-colors"
            >
              <ChevronRight
                size={16}
                className={cn(
                  'transition-transform',
                  isCollapsed && 'rotate-180'
                )}
              />
            </button>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="space-y-4">
            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-2">
              {questionsGrid.map((num) => (
                <button
                  key={num}
                  onClick={() => onQuestionSelect(num)}
                  className={cn(
                    'aspect-square rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center text-white',
                    currentQuestion === num
                      ? 'border-3 border-primary-green bg-primary-green'
                      : answeredQuestions.has(num)
                        ? 'bg-success-green hover:bg-success-green/80'
                        : 'bg-border hover:bg-border/80'
                  )}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-success-green" />
                <span className="text-text-light">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-primary-green" />
                <span className="text-text-light">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-border" />
                <span className="text-text-light">Not Answered</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
