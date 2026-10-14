'use client'

import React from 'react'
import { Button } from './ui/button'
import { RotateCcw, GaugeCircle as ChangeCircle, Home } from 'lucide-react'

interface ResultsActionsProps {
  onPracticeAgain: () => void
  onTryDifferentSubject: () => void
  onReturnToDashboard: () => void
}

export function ResultsActions({
  onPracticeAgain,
  onTryDifferentSubject,
  onReturnToDashboard
}: ResultsActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 pb-12">
      <Button
        onClick={onPracticeAgain}
        className="gap-2"
        size="lg"
      >
        <RotateCcw size={18} />
        Practice Again
      </Button>

      <Button
        onClick={onTryDifferentSubject}
        variant="outline"
        className="gap-2 bg-transparent"
        size="lg"
      >
        <ChangeCircle size={18} />
        Try Different Subject
      </Button>

      <Button
        onClick={onReturnToDashboard}
        variant="ghost"
        className="gap-2 text-text-dark"
        size="lg"
      >
        <Home size={18} />
        Return to Dashboard
      </Button>
    </div>
  )
}
