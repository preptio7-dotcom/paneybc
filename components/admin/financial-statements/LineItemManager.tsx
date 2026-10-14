'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, Plus } from 'lucide-react'

export type LineItemDraft = {
  id: string
  heading: string
  inputType: 'dropdown' | 'manual'
  groupLabel?: string
  dropdownOptions: string[]
  correctValue: string
  marks: number
  displayOrder: number
}

interface LineItemManagerProps {
  label: string
  groupOptions?: string[]
  items: LineItemDraft[]
  onChange: (items: LineItemDraft[]) => void
}

export function LineItemManager({ label, items, onChange, groupOptions }: LineItemManagerProps) {
  const updateItem = (id: string, field: keyof LineItemDraft, value: any) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const addItem = () => {
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.displayOrder)) + 1 : 1
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        heading: '',
        inputType: 'dropdown',
        groupLabel: '',
        dropdownOptions: ['', ''],
        correctValue: '',
        marks: 1,
        displayOrder: nextOrder,
      },
    ])
  }

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const addOption = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    updateItem(id, 'dropdownOptions', [...item.dropdownOptions, ''])
  }

  const updateOption = (id: string, index: number, value: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const next = [...item.dropdownOptions]
    next[index] = value
    updateItem(id, 'dropdownOptions', next)
  }

  const removeOption = (id: string, index: number) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const next = item.dropdownOptions.filter((_, idx) => idx !== index)
    updateItem(id, 'dropdownOptions', next.length ? next : [''])
    if (!next.includes(item.correctValue)) {
      updateItem(id, 'correctValue', '')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-text-dark">{label} Line Items</h3>
          <p className="text-sm text-text-light">Add headings, marks, and dropdown options.</p>
        </div>
        <Button size="sm" onClick={addItem} className="gap-2">
          <Plus size={16} />
          Add {label} Item
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="border border-border bg-white">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-dark">Heading Name *</label>
                  <Input
                    value={item.heading}
                    onChange={(event) => updateItem(item.id, 'heading', event.target.value)}
                    placeholder="e.g. Revenue, Cost of Sales"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-dark">Marks *</label>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    value={item.marks}
                    onChange={(event) => updateItem(item.id, 'marks', Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-dark">Display Order *</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.displayOrder}
                    onChange={(event) => updateItem(item.id, 'displayOrder', Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-dark">Answer Type *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={item.inputType}
                      onChange={(event) => updateItem(item.id, 'inputType', event.target.value)}
                    >
                      <option value="dropdown">Dropdown (choose option)</option>
                      <option value="manual">Manual entry (student types)</option>
                    </select>
                    {item.inputType === 'manual' ? (
                      <Input
                        value={item.correctValue}
                        onChange={(event) => updateItem(item.id, 'correctValue', event.target.value)}
                        placeholder="Correct value (manual)"
                      />
                    ) : (
                      <select
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                        value={item.correctValue}
                        onChange={(event) => updateItem(item.id, 'correctValue', event.target.value)}
                      >
                        <option value="">Select correct answer</option>
                        {item.dropdownOptions.map((option, index) => (
                          <option key={`${item.id}-correct-${index}`} value={option}>
                            {option || `Option ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {groupOptions && groupOptions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-dark">Section Heading (SOFP)</label>
                  <Input
                    list={`${label}-group-options`}
                    value={item.groupLabel || ''}
                    onChange={(event) => updateItem(item.id, 'groupLabel', event.target.value)}
                    placeholder="Choose or type a section heading"
                  />
                  <datalist id={`${label}-group-options`}>
                    {groupOptions.map((group) => (
                      <option key={group} value={group} />
                    ))}
                  </datalist>
                  <p className="text-xs text-text-light">
                    Items with the same section heading will appear grouped for students.
                  </p>
                </div>
              )}

              {item.inputType === 'dropdown' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-dark">Dropdown Options *</label>
                  <div className="space-y-2">
                    {item.dropdownOptions.map((option, index) => (
                      <div key={`${item.id}-option-${index}`} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(event) => updateOption(item.id, index, event.target.value)}
                          placeholder={`Option ${index + 1}`}
                        />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          removeOption(item.id, index)
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      addOption(item.id)
                    }}
                  >
                    + Add option
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                  Manual entry selected. Students will type the answer in a text box.
                </div>
              )}

              <div className="flex justify-end">
                <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(item.id)} className="gap-2">
                  <Trash2 size={14} />
                  Delete Line Item
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
