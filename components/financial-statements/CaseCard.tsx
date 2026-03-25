'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, FileText, ListChecks } from 'lucide-react'

interface CaseCardProps {
  caseNumber: string
  title: string
  timeLimit: number
  totalMarks: number
  questionCount?: number
  isActive?: boolean
  onStart: () => void
}

export function CaseCard({
  caseNumber,
  title,
  timeLimit,
  totalMarks,
  questionCount,
  isActive = true,
  onStart,
}: CaseCardProps) {
  return (
    <Card className="border-border bg-white shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">{caseNumber}</p>
            <h3 className="text-lg font-bold text-text-dark">{title}</h3>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
            {isActive ? 'Active' : 'Hidden'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-text-light">
          <span className="inline-flex items-center gap-2">
            <Clock size={16} className="text-primary-green" />
            Default: {timeLimit} min
          </span>
          <span className="inline-flex items-center gap-2">
            <FileText size={16} className="text-primary-green" />
            {totalMarks} marks
          </span>
          {typeof questionCount === 'number' && (
            <span className="inline-flex items-center gap-2">
              <ListChecks size={16} className="text-primary-green" />
              {questionCount} questions
            </span>
          )}
        </div>

        <Button onClick={onStart} className="w-full">
          Start Practice
        </Button>
      </CardContent>
    </Card>
  )
}
