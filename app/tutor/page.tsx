'use client'

import React, { useMemo, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const PRESET_QA = [
  {
    question: 'Explain the difference between cash basis and accrual basis accounting.',
    answer:
      'Cash basis records revenue and expenses when cash changes hands. Accrual basis recognizes revenue when earned and expenses when incurred, even if cash is received or paid later.',
  },
  {
    question: 'Why is this the correct answer?',
    answer:
      'The correct option matches the accounting principle tested in the question. Check the definition, then eliminate options that violate recognition or measurement rules.',
  },
  {
    question: 'Give me a real-world example of this concept.',
    answer:
      'Example: A company delivers services in March but receives payment in April. Under accrual basis, March revenue is recorded in March.',
  },
  {
    question: 'How do I improve weak topics faster?',
    answer:
      'Practice short focused sets, review explanations immediately, and repeat missed questions within 1-3 days to reinforce memory.',
  },
  {
    question: 'What is a quick way to check time management?',
    answer:
      'Aim for a consistent pace by dividing total time by number of questions. If you fall behind, flag long questions and return later.',
  },
]

export default function TutorPage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return PRESET_QA
    const lower = query.toLowerCase()
    return PRESET_QA.filter((item) => item.question.toLowerCase().includes(lower))
  }, [query])

  const activeAnswer = selected !== null ? PRESET_QA[selected] : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />
      <main className="flex-1 pt-[90px] pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800">AI Tutor (Offline Mode)</h1>
            <p className="text-slate-500">
              Ask a question and get quick guidance from the built-in knowledge base. Live AI will appear here once enabled.
            </p>
          </div>

          <Card className="border border-border bg-white">
            <CardContent className="p-6 space-y-4">
              <Input
                placeholder="Search a concept or pick a suggested question..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((item, index) => (
                  <Button
                    key={item.question}
                    variant={selected === index ? 'default' : 'outline'}
                    className="justify-start h-auto text-left whitespace-normal"
                    onClick={() => setSelected(index)}
                  >
                    {item.question}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {activeAnswer && (
            <Card className="border border-border bg-white">
              <CardHeader>
                <CardTitle>{activeAnswer.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600 leading-relaxed">
                {activeAnswer.answer}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
