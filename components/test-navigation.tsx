'use client'

import React from 'react'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TestNavigationProps {
  currentQuestion: number
  totalQuestions: number
  onPrevious: () => void
  onNext: () => void
  onSubmit: () => void
}

export function TestNavigation({
  currentQuestion,
  totalQuestions,
  onPrevious,
  onNext,
  onSubmit
}: TestNavigationProps) {
  const isFirstQuestion = currentQuestion === 1
  const isLastQuestion = currentQuestion === totalQuestions

  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between">
      <div className="flex gap-2">
        <Button
          onClick={onPrevious}
          disabled={isFirstQuestion}
          variant="outline"
          className="gap-2 bg-transparent"
        >
          <ChevronLeft size={18} />
          Previous
        </Button>
        <Button
          onClick={onNext}
          disabled={isLastQuestion}
          variant="outline"
          className="gap-2 bg-transparent"
        >
          Next
          <ChevronRight size={18} />
        </Button>
      </div>

      {isLastQuestion && (
        <Button
          onClick={onSubmit}
          className="bg-success-green hover:bg-success-green/90 gap-2"
        >
          Submit Test
        </Button>
      )}
    </div>
  )
}
