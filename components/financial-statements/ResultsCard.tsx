'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Clock } from 'lucide-react'

interface ResultsCardProps {
  totalMarks: number
  obtainedMarks: number
  percentage: number
  timeSpent: number
}

export function ResultsCard({ totalMarks, obtainedMarks, percentage, timeSpent }: ResultsCardProps) {
  const minutes = Math.floor(timeSpent / 60)
  const seconds = timeSpent % 60

  return (
    <Card className="border border-border bg-white shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Your Results</p>
            <p className="text-2xl font-bold text-text-dark">
              {obtainedMarks} / {totalMarks}
            </p>
          </div>
        </div>
        <div className="text-sm text-text-light">
          Score: <span className="font-semibold text-text-dark">{percentage}%</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-light">
          <Clock size={16} />
          Time: {minutes}m {seconds}s
        </div>
      </CardContent>
    </Card>
  )
}
