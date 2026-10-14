'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { AlertCircle, Clock } from 'lucide-react'

interface TestHeaderProps {
  currentQuestion: number
  totalQuestions: number
  timeRemaining: number
  onEndTest: () => void
}

export function TestHeader({
  currentQuestion,
  totalQuestions,
  timeRemaining,
  onEndTest
}: TestHeaderProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  // Blink animation for timer when less than 5 minutes
  useEffect(() => {
    if (timeRemaining < 300) {
      const interval = setInterval(() => {
        setIsBlinking(prev => !prev)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [timeRemaining])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-border z-40 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
        {/* Left - Question Counter */}
        <div className="text-text-dark text-sm font-medium">
          Question: <span className="font-bold text-primary-green">{currentQuestion}/{totalQuestions}</span> | Marks: <span className="font-bold">02</span>
        </div>

        {/* Center - Empty */}
        <div />

        {/* Right - Timer and End Test */}
        <div className="flex items-center gap-6">
          {/* Timer Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-gold/20 border-2 border-secondary-gold transition-opacity ${isBlinking && timeRemaining < 300 ? 'opacity-50 animate-pulse' : ''}`}>
            <Clock size={18} className="text-secondary-gold" />
            <span className="font-mono font-bold text-lg text-secondary-gold">
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* End Test Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={onEndTest}
            className="gap-2"
          >
            <AlertCircle size={16} />
            END TEST
          </Button>
        </div>
      </div>
    </div>
  )
}
