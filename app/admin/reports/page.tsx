'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Loader2, Pencil } from 'lucide-react'

type ReportRow = {
  id: string
  questionId: string
  questionText?: string
  subject?: string
  questionNumber?: number
  reason?: string
  status?: string
  email?: string
  createdAt?: string
  question?: any
}

export default function AdminReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = useState<ReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingReport, setEditingReport] = useState<ReportRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [fsReports, setFsReports] = useState<any[]>([])
  const [isLoadingFs, setIsLoadingFs] = useState(true)
  const [resolvingFsId, setResolvingFsId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    question: '',
    imageUrl: '',
    options: ['', '', '', ''],
    explanation: '',
    difficulty: 'medium',
    allowMultiple: false,
    correctAnswer: 0,
    correctAnswers: [] as number[],
    maxSelections: 2,
  })

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/reports?limit=200')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reports')
      }
      setReports(data.reports || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reports.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
    const loadFs = async () => {
      try {
        setIsLoadingFs(true)
        const response = await fetch('/api/admin/financial-statement-reports?limit=200')
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load financial statement reports')
        }
        setFsReports(data.reports || [])
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load financial statement reports.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingFs(false)
      }
    }
    loadFs()
  }, [])

  const openEdit = (report: ReportRow) => {
    const q = report.question
    if (!q) {
      toast({
        title: 'Question not found',
        description: 'This reported question is missing from the database.',
        variant: 'destructive',
      })
      return
    }
    const hasMultiple = Boolean(q.allowMultiple || (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1))
    setEditingReport(report)
    setEditForm({
      question: q.question || '',
      imageUrl: q.imageUrl || '',
      options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      allowMultiple: hasMultiple,
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [],
      maxSelections: q.maxSelections || 2,
    })
    setIsEditing(true)
  }

  const handleEditSave = async () => {
    if (!editingReport?.question) return
    if (editForm.options.some((opt) => !opt.trim())) {
      toast({
        title: 'Error',
        description: 'All 4 options are required.',
        variant: 'destructive',
      })
      return
    }

    if (editForm.allowMultiple) {
      if (!Array.isArray(editForm.correctAnswers) || editForm.correctAnswers.length === 0) {
        toast({
          title: 'Error',
          description: 'Select at least one correct answer.',
          variant: 'destructive',
        })
        return
      }
    } else {
      if (typeof editForm.correctAnswer !== 'number' || editForm.correctAnswer < 0 || editForm.correctAnswer > 3) {
        toast({
          title: 'Error',
          description: 'Correct answer must be between 0 and 3.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setIsSaving(true)
      const q = editingReport.question
      const response = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: editForm.question,
          imageUrl: editForm.imageUrl?.trim() || null,
          options: editForm.options,
          explanation: editForm.explanation,
          difficulty: editForm.difficulty,
          allowMultiple: editForm.allowMultiple,
          correctAnswer: editForm.allowMultiple ? undefined : editForm.correctAnswer,
          correctAnswers: editForm.allowMultiple ? editForm.correctAnswers : undefined,
          maxSelections: editForm.allowMultiple ? editForm.maxSelections : 1,
          subject: q.subject,
          chapter: q.chapter,
          questionNumber: q.questionNumber,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update question')
      }

      setReports((prev) => prev.filter((r) => r.questionId !== q.id))
      setIsEditing(false)
      setEditingReport(null)
      toast({
        title: 'Question updated',
        description: 'The report has been cleared and the user was notified.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Update failed.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResolveReport = async (reportId: string) => {
    try {
      setResolvingId(reportId)
      const response = await fetch(`/api/admin/reports/${reportId}`, { method: 'PATCH' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve report')
      }
      setReports((prev) => prev.filter((report) => report.id !== reportId))
      toast({
        title: 'Report resolved',
        description: 'The report was marked as resolved.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve report.',
        variant: 'destructive',
      })
    } finally {
      setResolvingId(null)
    }
  }

  const handleResolveFsReport = async (reportId: string) => {
    try {
      setResolvingFsId(reportId)
      const response = await fetch(`/api/admin/financial-statement-reports/${reportId}`, { method: 'PATCH' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve report')
      }
      setFsReports((prev) => prev.filter((report) => report.id !== reportId))
      toast({
        title: 'Report resolved',
        description: 'The financial statement report was marked as resolved.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve report.',
        variant: 'destructive',
      })
    } finally {
      setResolvingFsId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background-light">
      <AdminHeader />
      <main className="pt-[90px] pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold text-text-dark">Question Reports</h1>
              <p className="text-text-light">Review reported questions and resolve them quickly.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={fetchReports} disabled={isLoading}>
                Refresh
              </Button>
              <Link href="/admin/questions">
                <Button>Open Question Manager</Button>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary-green" size={32} />
            </div>
          ) : reports.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-6 text-sm text-text-light">
                No open reports right now.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-border bg-white">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-text-light">
                          {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Unknown time'} •{' '}
                          {report.email || 'Unknown user'}
                        </p>
                        <p className="text-sm font-semibold text-text-dark">
                          {report.subject || 'Unknown Subject'} • Q#{report.questionNumber || 'N/A'}
                        </p>
                        <p className="text-sm text-text-dark">
                          {report.question?.question || report.questionText || 'Question text unavailable.'}
                        </p>
                        <p className="text-xs text-text-light">
                          Report: {report.reason || 'No reason provided.'}
                        </p>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-2">
                        <Badge variant="outline" className="uppercase text-xs">
                          {report.status || 'open'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(report)} className="gap-2">
                            <Pencil size={14} />
                            Edit Question
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <CheckCircle2 size={14} />
                                Resolve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Resolve report?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will mark the report as resolved and make the question visible again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleResolveReport(report.id)}
                                  disabled={resolvingId === report.id}
                                >
                                  {resolvingId === report.id ? 'Resolving...' : 'Resolve'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Financial Statement Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingFs ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-primary-green" size={28} />
                </div>
              ) : fsReports.length === 0 ? (
                <p className="text-sm text-text-light">No financial statement reports right now.</p>
              ) : (
                <div className="space-y-4">
                  {fsReports.map((report) => (
                    <div key={report.id} className="border border-border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <p className="text-xs text-text-light">
                            {new Date(report.createdAt).toLocaleString()} • {report.email}
                          </p>
                          <p className="text-sm font-semibold text-text-dark">
                            {report.caseNumber || 'Case'} • {report.caseTitle || 'Financial Statements'}
                          </p>
                          <p className="text-sm text-text-dark mt-2">
                            {report.section} • {report.heading || 'Line item'}
                          </p>
                          <p className="text-xs text-text-light mt-2">Report: {report.reason}</p>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-2">
                          <Badge variant="outline" className="uppercase text-xs">
                            {report.status || 'open'}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/financial-statements/edit/${report.caseId}`}>
                              <Button variant="outline" size="sm" className="gap-2">
                                <Pencil size={14} />
                                Open Case
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <CheckCircle2 size={14} />
                                Resolve
                              </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Resolve report?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark the report as resolved.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleResolveFsReport(report.id)}
                                    disabled={resolvingFsId === report.id}
                                  >
                                    {resolvingFsId === report.id ? 'Resolving...' : 'Resolve'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Fix the question and save to clear the report.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Question</label>
              <Textarea
                value={editForm.question}
                onChange={(e) => setEditForm((prev) => ({ ...prev, question: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Question Image URL (optional)</label>
              <Input
                value={editForm.imageUrl}
                onChange={(e) => setEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              />
              {editForm.imageUrl ? (
                <div className="mt-2">
                  <img
                    src={editForm.imageUrl}
                    alt="Question diagram preview"
                    className="h-40 w-auto rounded border border-border bg-white object-contain"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Options</label>
              {editForm.options.map((opt, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Option {String.fromCharCode(65 + idx)}</label>
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...editForm.options]
                      next[idx] = e.target.value
                      setEditForm((prev) => ({ ...prev, options: next }))
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Explanation</label>
              <Textarea
                value={editForm.explanation}
                onChange={(e) => setEditForm((prev) => ({ ...prev, explanation: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Difficulty</label>
                <Select value={editForm.difficulty} onValueChange={(value) => setEditForm((prev) => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Answer Type</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.allowMultiple}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, allowMultiple: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-600">Allow multiple answers</span>
                </div>
                {editForm.allowMultiple && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Max selections</label>
                    <Input
                      type="number"
                      min="2"
                      max="4"
                      value={editForm.maxSelections}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, maxSelections: Number(e.target.value) || 2 }))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            </div>
            {editForm.allowMultiple ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Correct Answers</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {editForm.options.map((_, idx) => {
                    const checked = editForm.correctAnswers.includes(idx)
                    return (
                      <label key={idx} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(editForm.correctAnswers)
                            if (e.target.checked) {
                              next.add(idx)
                            } else {
                              next.delete(idx)
                            }
                            setEditForm((prev) => ({ ...prev, correctAnswers: Array.from(next).sort() }))
                          }}
                        />
                        Option {String.fromCharCode(65 + idx)}
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Correct Answer</label>
                <Select value={String(editForm.correctAnswer)} onValueChange={(value) => setEditForm((prev) => ({ ...prev, correctAnswer: Number(value) }))}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {editForm.options.map((_, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        Option {String.fromCharCode(65 + idx)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
