'use client'

import React, { useEffect, useRef, useState } from 'react'
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
import { Loader2, Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react'
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

interface ManualInputRow {
  questionNumber: string
  chapter: string
  question: string
  options: string[]
  optionImageUrls: string[]
  correctIndex: string
  explanation: string
  difficulty: string
  imageUrl: string
}

const optionLetters = ['A', 'B', 'C', 'D'] as const

export function TextInputArea() {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null)
  const [previewRow, setPreviewRow] = useState<number | null>(null)

  const questionImageInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const optionImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const createRow = (): ManualInputRow => ({
    questionNumber: '',
    chapter: '',
    question: '',
    options: ['', '', '', ''],
    optionImageUrls: ['', '', '', ''],
    correctIndex: '1',
    explanation: '',
    difficulty: 'medium',
    imageUrl: '',
  })

  const [rows, setRows] = useState<ManualInputRow[]>([createRow()])

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    setRows([createRow()])
  }, [subject])

  const updateRow = (rowIndex: number, updater: (row: ManualInputRow) => ManualInputRow) => {
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row
        return updater(row)
      })
    )
  }

  const updateRowField = <K extends keyof ManualInputRow>(
    rowIndex: number,
    field: K,
    value: ManualInputRow[K]
  ) => {
    updateRow(rowIndex, (row) => ({ ...row, [field]: value }))
  }

  const updateOptionValue = (rowIndex: number, optionIndex: number, value: string) => {
    updateRow(rowIndex, (row) => ({
      ...row,
      options: row.options.map((option, idx) => (idx === optionIndex ? value : option)),
    }))
  }

  const updateOptionImageValue = (rowIndex: number, optionIndex: number, value: string) => {
    updateRow(rowIndex, (row) => ({
      ...row,
      optionImageUrls: row.optionImageUrls.map((imageUrl, idx) =>
        idx === optionIndex ? value : imageUrl
      ),
    }))
  }

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
        title: 'Input Required',
        description: 'Please enter at least one MCQ before submitting.',
        variant: 'destructive',
      })
      return
    }

    if (!subject) {
      toast({
        title: 'Subject Required',
        description: 'Please select a subject for the MCQs.',
        variant: 'destructive',
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
          optionImageUrls: row.optionImageUrls.map((url) => url.trim()),
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
          title: 'Success',
          description: `Submitted ${data.count} questions successfully!`,
        })
        setRows([createRow()])
      } else {
        throw new Error(data.error || 'Submission failed')
      }
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (
    rowIndex: number,
    file: File,
    target: 'question' | 'option',
    optionIndex?: number
  ) => {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file.',
        variant: 'destructive',
      })
      return
    }

    const imageKey = target === 'question' ? `q-${rowIndex}` : `o-${rowIndex}-${optionIndex ?? 0}`

    try {
      setUploadingImageKey(imageKey)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/upload/image', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Image upload failed')
      }
      if (!data.publicUrl) {
        throw new Error('Upload succeeded but no URL was returned')
      }

      if (target === 'question') {
        updateRowField(rowIndex, 'imageUrl', data.publicUrl)
      } else if (typeof optionIndex === 'number') {
        updateOptionImageValue(rowIndex, optionIndex, data.publicUrl)
      }

      toast({
        title: 'Uploaded',
        description: 'Image uploaded and URL filled automatically.',
      })
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Unable to upload image.',
        variant: 'destructive',
      })
    } finally {
      setUploadingImageKey((prev) => (prev === imageKey ? null : prev))

      if (target === 'question') {
        const inputRef = questionImageInputRefs.current[rowIndex]
        if (inputRef) inputRef.value = ''
      } else if (typeof optionIndex === 'number') {
        const optionInputKey = `o-${rowIndex}-${optionIndex}`
        const inputRef = optionImageInputRefs.current[optionInputKey]
        if (inputRef) inputRef.value = ''
      }
    }
  }

  return (
    <Card className="border-2 border-border">
      <CardContent className="space-y-6 pt-6 pb-6">
        <div className="rounded-xl border border-border bg-slate-50/50 p-4">
          <Label htmlFor="subject-text" className="mb-2 block text-sm font-semibold">
            Select Subject
          </Label>
          <Select value={subject} onValueChange={setSubject} disabled={isLoadingSubjects}>
            <SelectTrigger id="subject-text">
              <SelectValue placeholder={isLoadingSubjects ? 'Loading subjects...' : 'Choose a subject'} />
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

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-sm font-semibold">Direct Input</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, createRow()])}
              className="gap-2"
            >
              <Plus size={14} />
              Add Row
            </Button>
          </div>

          <div className="space-y-4">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">Question Row {rowIndex + 1}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewRow(rowIndex)}
                      className="gap-2"
                    >
                      <ImageIcon size={14} />
                      Preview
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== rowIndex))}
                      disabled={rows.length === 1}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Question #
                    </Label>
                    <Input
                      value={row.questionNumber}
                      onChange={(e) => updateRowField(rowIndex, 'questionNumber', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Chapter
                    </Label>
                    <Input
                      value={row.chapter}
                      onChange={(e) => updateRowField(rowIndex, 'chapter', e.target.value)}
                      placeholder="CH1"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Correct Option
                    </Label>
                    <Select
                      value={row.correctIndex}
                      onValueChange={(value) => updateRowField(rowIndex, 'correctIndex', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">A</SelectItem>
                        <SelectItem value="2">B</SelectItem>
                        <SelectItem value="3">C</SelectItem>
                        <SelectItem value="4">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Difficulty
                    </Label>
                    <Select
                      value={row.difficulty}
                      onValueChange={(value) => updateRowField(rowIndex, 'difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="medium" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Question Text
                  </Label>
                  <Textarea
                    rows={3}
                    value={row.question}
                    onChange={(e) => updateRowField(rowIndex, 'question', e.target.value)}
                    placeholder="Question text"
                  />
                </div>

                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Question Image URL (optional)
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={row.imageUrl}
                      onChange={(e) => updateRowField(rowIndex, 'imageUrl', e.target.value)}
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 sm:w-auto"
                      onClick={() => questionImageInputRefs.current[rowIndex]?.click()}
                      disabled={uploadingImageKey === `q-${rowIndex}`}
                    >
                      {uploadingImageKey === `q-${rowIndex}` ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          Upload Image
                        </>
                      )}
                    </Button>
                    <input
                      ref={(el) => {
                        questionImageInputRefs.current[rowIndex] = el
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(rowIndex, file, 'question')
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Options</Label>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {row.options.map((opt, idx) => {
                      const optionInputKey = `o-${rowIndex}-${idx}`
                      const optionImageUrl = row.optionImageUrls[idx] || ''

                      return (
                        <div key={idx} className="space-y-2 rounded-lg border border-border bg-slate-50 p-3">
                          <Label className="text-xs font-semibold text-slate-600">
                            Option {optionLetters[idx]}
                          </Label>
                          <Input
                            value={opt}
                            onChange={(e) => updateOptionValue(rowIndex, idx, e.target.value)}
                            placeholder={`Option ${optionLetters[idx]}`}
                          />

                          <Label className="text-xs font-semibold text-slate-600">
                            Option {optionLetters[idx]} Image URL (optional)
                          </Label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              value={optionImageUrl}
                              onChange={(e) => updateOptionImageValue(rowIndex, idx, e.target.value)}
                              placeholder="https://..."
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2 sm:w-auto"
                              onClick={() => optionImageInputRefs.current[optionInputKey]?.click()}
                              disabled={uploadingImageKey === optionInputKey}
                            >
                              {uploadingImageKey === optionInputKey ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload size={14} />
                                  Upload
                                </>
                              )}
                            </Button>
                            <input
                              ref={(el) => {
                                optionImageInputRefs.current[optionInputKey] = el
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleImageUpload(rowIndex, file, 'option', idx)
                                }
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Explanation
                  </Label>
                  <Textarea
                    rows={3}
                    value={row.explanation}
                    onChange={(e) => updateRowField(rowIndex, 'explanation', e.target.value)}
                    placeholder="Explanation"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !subject}
          className="w-full gap-2 bg-[#0F7938] text-white shadow-md transition-all hover:bg-[#0F7938]/90"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Submitting...
            </>
          ) : (
            'Submit MCQs'
          )}
        </Button>
      </CardContent>

      <Dialog open={previewRow !== null} onOpenChange={() => setPreviewRow(null)}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
            <DialogDescription>Preview how this question will appear in tests.</DialogDescription>
          </DialogHeader>
          {previewRow !== null && rows[previewRow] ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                Question #{rows[previewRow].questionNumber || '-'}
              </div>
              <div className="text-lg font-semibold text-text-dark">
                {rows[previewRow].question || 'Question text'}
              </div>
              {rows[previewRow].imageUrl?.trim() ? (
                <img
                  src={rows[previewRow].imageUrl.trim()}
                  alt="Question diagram preview"
                  className="max-h-80 w-full rounded-lg border border-border bg-white object-contain"
                />
              ) : null}
              <div className="grid grid-cols-1 gap-2">
                {rows[previewRow].options.map((opt, idx) => (
                  <div key={idx} className="rounded-lg border border-border px-3 py-2 text-sm text-slate-700">
                    <span className="mr-2 font-semibold">{optionLetters[idx]}.</span>
                    {opt || `Option ${optionLetters[idx]}`}
                    {rows[previewRow].optionImageUrls[idx]?.trim() ? (
                      <img
                        src={rows[previewRow].optionImageUrls[idx].trim()}
                        alt={`Option ${optionLetters[idx]} preview`}
                        className="mt-2 max-h-40 w-full rounded-md border border-border bg-white object-contain"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
