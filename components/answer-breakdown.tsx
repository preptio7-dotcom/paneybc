'use client'

import React, { useState } from 'react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { ChevronDown, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnswerItem {
  questionNumber: number
  questionText: string
  yourAnswer: string
  correctAnswer: string
  isCorrect: boolean
  timeSpent: string
  explanation: string
}

interface AnswerBreakdownProps {
  answers: AnswerItem[]
  title?: string
  emptyMessage?: string
  alwaysExpanded?: boolean
}

export function AnswerBreakdown({ answers, title, emptyMessage, alwaysExpanded = false }: AnswerBreakdownProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedQuestions(newExpanded)
  }

  const hasAnswers = answers.length > 0

  return (
    <div className="mb-12">
      <h2 className="font-heading text-2xl font-bold text-text-dark mb-6">
        {title || 'DETAILED ANSWER BREAKDOWN'}
      </h2>

      {!hasAnswers && (
        <Card className="border border-border">
          <CardContent className="p-6 text-sm text-text-light">
            {emptyMessage || 'No answers to display.'}
          </CardContent>
        </Card>
      )}

      {hasAnswers && (
        <div className="space-y-3">
          {answers.map((answer, index) => (
          <Card
            key={`${answer.questionNumber}-${index}`}
            className="border border-border overflow-hidden"
          >
            {alwaysExpanded ? (
              <div className="w-full p-6 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="outline" className="bg-primary-green/10 border-primary-green/30">
                    Q{answer.questionNumber}
                  </Badge>
                  <Badge
                    className={cn(
                      'font-semibold',
                      answer.isCorrect
                        ? 'bg-success-green text-white'
                        : 'bg-error-red text-white'
                    )}
                  >
                    {answer.isCorrect ? 'CORRECT' : 'INCORRECT'}
                  </Badge>
                </div>
                <p className="font-medium text-text-dark mb-2">
                  {answer.questionText}
                </p>
                <div className="flex gap-6 text-sm text-text-light flex-wrap">
                  <div>
                    Your Answer: <span className="font-semibold text-text-dark">{answer.yourAnswer}</span>
                  </div>
                  <div>
                    Correct Answer: <span className="font-semibold text-success-green">{answer.correctAnswer}</span>
                  </div>
                  <div>
                    Time: <span className="font-semibold text-text-dark">{answer.timeSpent}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-semibold text-text-dark mb-2">
                    Explanation:
                  </p>
                  <p className="text-sm text-text-light leading-relaxed italic">
                    {answer.explanation}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full p-6 flex items-start justify-between hover:bg-background-light/50 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline" className="bg-primary-green/10 border-primary-green/30">
                        Q{answer.questionNumber}
                      </Badge>
                      <Badge
                        className={cn(
                          'font-semibold',
                          answer.isCorrect
                            ? 'bg-success-green text-white'
                            : 'bg-error-red text-white'
                        )}
                      >
                        {answer.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </Badge>
                    </div>
                    <p className="font-medium text-text-dark mb-2">
                      {answer.questionText}
                    </p>
                    <div className="flex gap-6 text-sm text-text-light flex-wrap">
                      <div>
                        Your Answer: <span className="font-semibold text-text-dark">{answer.yourAnswer}</span>
                      </div>
                      <div>
                        Correct Answer: <span className="font-semibold text-success-green">{answer.correctAnswer}</span>
                      </div>
                      <div>
                        Time: <span className="font-semibold text-text-dark">{answer.timeSpent}</span>
                      </div>
                    </div>
                  </div>

                  <ChevronDown
                    size={20}
                    className={cn(
                      'text-text-light transition-transform flex-shrink-0 ml-4',
                      expandedQuestions.has(index) && 'rotate-180'
                    )}
                  />
                </button>

                {expandedQuestions.has(index) && (
                  <div className="px-6 pb-6 border-t border-border bg-background-light/30">
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-text-dark mb-2">
                        Explanation:
                      </p>
                      <p className="text-sm text-text-light leading-relaxed italic">
                        {answer.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
          ))}
        </div>
      )}
    </div>
  )
}
