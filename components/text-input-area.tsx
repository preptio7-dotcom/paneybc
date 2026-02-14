'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

interface Subject {
  _id: string
  name: string
  code: string
  chapters?: {
    name: string
    code: string
    order: number
  }[]
}

export function TextInputArea() {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewRow, setPreviewRow] = useState<number | null>(null)

  const createRow = () => ({
    questionNumber: '',
    chapter: '',
    question: '',
    options: ['', '', '', ''],
    correctIndex: '1',
    explanation: '',
    difficulty: 'medium',
    imageUrl: '',
  })

  const [rows, setRows] = useState([createRow()])

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    setRows([createRow()])
  }, [subject])

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true)
      const response = await fetch('/api/admin/subjects')
      const data = await response.json()
      if (response.ok) {
        setSubjects(data.subjects || [])
      }
    } catch (error) {
      console.error('Failed to load subjects:', error)
    } finally {
      setIsLoadingSubjects(false)
    }
  }

  const handleSubmit = async () => {
    const hasValidRows = rows.some((row) => row.question.trim().length > 0)
    if (!hasValidRows) {
      toast({
        title: "Input Required",
        description: "Please enter at least one MCQ before submitting.",
        variant: "destructive"
      })
      return
    }

    if (!subject) {
      toast({
        title: "Subject Required",
        description: "Please select a subject for the MCQs.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const payload = rows
        .filter((row) => row.question.trim().length > 0)
        .map((row) => ({
          questionNumber: Number(row.questionNumber),
          chapter: row.chapter.trim(),
          question: row.question.trim(),
          options: row.options.map((opt) => opt.trim()),
          correctIndex: Number(row.correctIndex),
          explanation: row.explanation.trim(),
          difficulty: row.difficulty,
          imageUrl: row.imageUrl.trim(),
        }))

      const response = await fetch('/api/admin/upload/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, questions: payload }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Submitted ${data.count} questions successfully!`,
        })
        setRows([createRow()])
      } else {
        throw new Error(data.error || 'Submission failed')
      }
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-2 border-border">
      <CardContent className="pt-8 pb-6 space-y-4">
        {/* Subject Selection */}
        <div>
          <Label htmlFor="subject-text" className="text-sm font-semibold mb-2 block">
            Select Subject
          </Label>
          <Select value={subject} onValueChange={setSubject} disabled={isLoadingSubjects}>
            <SelectTrigger id="subject-text">
              <SelectValue placeholder={isLoadingSubjects ? "Loading subjects..." : "Choose a subject"} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((sub, idx) => (
                <SelectItem key={sub._id ?? sub.code ?? `${sub.name ?? 'subject'}-${idx}`} value={sub.code}>
                  {sub.name} ({sub.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Direct Input Table</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, createRow()])}
              className="gap-2"
            >
              <Plus size={14} />
              Add Row
            </Button>
          </div>
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Chapter</th>
                  <th className="px-3 py-2 text-left min-w-[220px]">Question</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Opt A</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Opt B</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Opt C</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Opt D</th>
                  <th className="px-3 py-2 text-left">Correct</th>
                  <th className="px-3 py-2 text-left min-w-[200px]">Explanation</th>
                  <th className="px-3 py-2 text-left">Difficulty</th>
                  <th className="px-3 py-2 text-left min-w-[200px]">Image URL</th>
                  <th className="px-3 py-2 text-left">Preview</th>
                  <th className="px-3 py-2 text-left">Remove</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Input
                        value={row.questionNumber}
                        onChange={(e) => {
                          const next = [...rows]
                          next[rowIndex].questionNumber = e.target.value
                          setRows(next)
                        }}
                        placeholder="1"
                        className="w-16"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.chapter}
                        onChange={(e) => {
                          const next = [...rows]
                          next[rowIndex].chapter = e.target.value
                          setRows(next)
                        }}
                        placeholder="CH1"
                        className="w-20"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        rows={2}
                        value={row.question}
                        onChange={(e) => {
                          const next = [...rows]
                          next[rowIndex].question = e.target.value
                          setRows(next)
                        }}
                        placeholder="Question text"
                      />
                    </td>
                    {row.options.map((opt, idx) => (
                      <td className="px-3 py-2" key={idx}>
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...rows]
                            next[rowIndex].options[idx] = e.target.value
                            setRows(next)
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <Select
                        value={row.correctIndex}
                        onValueChange={(value) => {
                          const next = [...rows]
                          next[rowIndex].correctIndex = value
                          setRows(next)
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="1" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">A</SelectItem>
                          <SelectItem value="2">B</SelectItem>
                          <SelectItem value="3">C</SelectItem>
                          <SelectItem value="4">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        rows={2}
                        value={row.explanation}
                        onChange={(e) => {
                          const next = [...rows]
                          next[rowIndex].explanation = e.target.value
                          setRows(next)
                        }}
                        placeholder="Explanation"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={row.difficulty}
                        onValueChange={(value) => {
                          const next = [...rows]
                          next[rowIndex].difficulty = value
                          setRows(next)
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="medium" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.imageUrl}
                        onChange={(e) => {
                          const next = [...rows]
                          next[rowIndex].imageUrl = e.target.value
                          setRows(next)
                        }}
                        placeholder="https://..."
                        className="min-w-[180px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!row.imageUrl.trim()}
                        onClick={() => setPreviewRow(rowIndex)}
                        className="gap-2"
                      >
                        <ImageIcon size={14} />
                        Preview
                      </Button>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== rowIndex))}
                        disabled={rows.length === 1}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !subject}
          className="w-full gap-2 bg-[#0F7938] hover:bg-[#0F7938]/90 text-white shadow-md transition-all"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Submitting...
            </>
          ) : 'Submit MCQs'}
        </Button>
      </CardContent>

      <Dialog open={previewRow !== null} onOpenChange={() => setPreviewRow(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
            <DialogDescription>Preview how this question will appear in tests.</DialogDescription>
          </DialogHeader>
          {previewRow !== null && rows[previewRow] ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">Question #{rows[previewRow].questionNumber || '—'}</div>
              <div className="text-lg font-semibold text-text-dark">{rows[previewRow].question || 'Question text'}</div>
              {rows[previewRow].imageUrl?.trim() ? (
                <img
                  src={rows[previewRow].imageUrl.trim()}
                  alt="Question diagram preview"
                  className="w-full max-h-80 object-contain rounded-lg border border-border bg-white"
                />
              ) : null}
              <div className="grid grid-cols-1 gap-2">
                {rows[previewRow].options.map((opt, idx) => (
                  <div key={idx} className="border border-border rounded-lg px-3 py-2 text-sm text-slate-700">
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt || `Option ${String.fromCharCode(65 + idx)}`}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewRow(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
