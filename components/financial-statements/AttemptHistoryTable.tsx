'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Attempt {
  id: number
  caseNumber: string
  totalMarksObtained: number
  totalMarks: number
  percentageScore: number
  submittedAt: string
}

interface AttemptHistoryTableProps {
  attempts: Attempt[]
  onView: (id: number) => void
}

export function AttemptHistoryTable({ attempts, onView }: AttemptHistoryTableProps) {
  return (
    <Card className="border-border bg-white">
      <CardContent className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Case</th>
              <th className="text-left px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Percentage</th>
              <th className="text-left px-4 py-3">Submitted</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr key={attempt.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-text-dark">{attempt.caseNumber}</td>
                <td className="px-4 py-3 text-text-light">
                  {attempt.totalMarksObtained} / {attempt.totalMarks}
                </td>
                <td className="px-4 py-3 text-text-light">{attempt.percentageScore}%</td>
                <td className="px-4 py-3 text-text-light">
                  {new Date(attempt.submittedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => onView(attempt.id)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
