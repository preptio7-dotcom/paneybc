'use client'

import { Fragment } from 'react'
interface LineItem {
  id: number
  heading: string
  correctValue: string
  marks: number
  groupLabel?: string
}

interface Answer {
  line_item_id: number
  selected_value: string
  correct_value: string
  is_correct: boolean
  marks_awarded: number
}

interface ReviewTableProps {
  lineItems: LineItem[]
  userAnswers: Answer[]
}

export function ReviewTable({ lineItems, userAnswers }: ReviewTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="text-left px-4 py-3">Line Item</th>
            <th className="text-left px-4 py-3">Your Answer</th>
            <th className="text-left px-4 py-3">Correct</th>
            <th className="text-right px-4 py-3">Marks</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => {
            const answer = userAnswers?.find((a) => a.line_item_id === item.id)
            const isCorrect = Boolean(answer?.is_correct)
            const previousGroup = index > 0 ? lineItems[index - 1].groupLabel : null
            const showGroup = item.groupLabel && item.groupLabel !== previousGroup
            return (
              <Fragment key={item.id}>
                {showGroup && (
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.groupLabel}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-text-dark">{item.heading}</td>
                  <td className={`px-4 py-3 ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {answer?.selected_value || 'Not answered'}
                  </td>
                  <td className="px-4 py-3 text-text-dark">{item.correctValue}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {answer?.marks_awarded || 0} / {item.marks}
                  </td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
