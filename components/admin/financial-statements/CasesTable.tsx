'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CaseSummary {
  id: number
  caseNumber: string
  title: string
  isActive: boolean
  defaultTimeLimit: number
  totalMarks: number
}

interface CasesTableProps {
  cases: CaseSummary[]
  onEdit: (id: number) => void
  onToggle: (id: number, isActive: boolean) => void
  onDelete: (id: number) => void
}

export function CasesTable({ cases, onEdit, onToggle, onDelete }: CasesTableProps) {
  return (
    <Card className="border-border bg-white">
      <CardContent className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Case</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Time</th>
              <th className="text-left px-4 py-3">Marks</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-text-dark">{item.caseNumber}</td>
                <td className="px-4 py-3 text-text-light">{item.title}</td>
                <td className="px-4 py-3 text-text-light">{item.defaultTimeLimit} min</td>
                <td className="px-4 py-3 text-text-light">{item.totalMarks}</td>
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                    {item.isActive ? 'Active' : 'Hidden'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(item.id)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggle(item.id, !item.isActive)}
                  >
                    {item.isActive ? 'Hide' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                    Delete
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
