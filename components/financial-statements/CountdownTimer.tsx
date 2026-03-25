'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

interface CountdownTimerProps {
  timeLimit: number
  onTimeout: () => void
}

export function CountdownTimer({ timeLimit, onTimeout }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimit)

  useEffect(() => {
    setSecondsLeft(timeLimit)
  }, [timeLimit])

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeout()
      return
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft, onTimeout])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="flex items-center gap-2 text-slate-600">
      <Timer size={18} />
      <span className="font-mono text-lg font-bold">
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  )
}
