'use client'

import { Fragment } from 'react'
import { ReportLineItemButton } from './ReportLineItemButton'
interface LineItem {
  id: number
  heading: string
  inputType?: 'dropdown' | 'manual'
  groupLabel?: string
  dropdownOptions: string[]
  marks: number
}

interface SofpTableProps {
  lineItems: LineItem[]
  answers: Array<{ line_item_id: number; selected_value: string }>
  onAnswerChange: (answers: Array<{ line_item_id: number; selected_value: string }>) => void
  caseId: number
}

export function SofpTable({ lineItems, answers, onAnswerChange, caseId }: SofpTableProps) {
  const handleSelect = (lineItemId: number, value: string) => {
    const next = [...answers]
    const index = next.findIndex((a) => a.line_item_id === lineItemId)
    if (index >= 0) {
      next[index] = { ...next[index], selected_value: value }
    } else {
      next.push({ line_item_id: lineItemId, selected_value: value })
    }
    onAnswerChange(next)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="text-left px-4 py-3">Line Item</th>
            <th className="text-left px-4 py-3">Select Value</th>
            <th className="text-right px-4 py-3">Marks</th>
            <th className="text-right px-4 py-3">Report</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => {
            const selected = answers.find((a) => a.line_item_id === item.id)?.selected_value || ''
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
                  <td className="px-4 py-3">
                    {item.inputType === 'manual' ? (
                      <input
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                        value={selected}
                        onChange={(event) => handleSelect(item.id, event.target.value)}
                        placeholder="Enter value"
                      />
                    ) : (
                      <select
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                        value={selected}
                        onChange={(event) => handleSelect(item.id, event.target.value)}
                      >
                        <option value="">Select value</option>
                        {item.dropdownOptions.map((option, optIndex) => (
                          <option key={`${item.id}-${optIndex}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.marks}</td>
                  <td className="px-4 py-3 text-right">
                    <ReportLineItemButton
                      caseId={caseId}
                      section="SOFP"
                      lineItemId={item.id}
                      heading={item.heading}
                    />
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
