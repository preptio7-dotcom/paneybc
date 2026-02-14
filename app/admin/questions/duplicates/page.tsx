'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Trash2, RefreshCw } from 'lucide-react'
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

type DuplicateQuestion = {
  id: string
  subject: string
  chapter?: string | null
  question: string
  options: string[]
  correctAnswer?: number | null
  correctAnswers?: number[]
  allowMultiple?: boolean
  maxSelections?: number
  explanation?: string | null
  difficulty: string
  createdAt: string
}

type DuplicateGroup = {
  count: number
  items: DuplicateQuestion[]
}

export default function DuplicateQuestionsPage() {
  const { toast } = useToast()
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (subjectFilter.trim()) params.set('subject', subjectFilter.trim())
    if (chapterFilter.trim()) params.set('chapter', chapterFilter.trim())
    return params.toString()
  }, [subjectFilter, chapterFilter])

  const loadDuplicates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/questions/duplicates?${queryString}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load duplicates')
      setGroups(data.groups || [])

      const nextSelected = new Set<string>()
      ;(data.groups || []).forEach((group: DuplicateGroup) => {
        // keep the earliest item (first), select the rest for deletion
        group.items.slice(1).forEach((item) => nextSelected.add(item.id))
      })
      setSelectedIds(nextSelected)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load duplicates',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDuplicates()
  }, [queryString])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0 || isDeleting) return
    try {
      setIsDeleting(true)
      const response = await fetch('/api/admin/questions/delete-many', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete')
      toast({
        title: 'Deleted',
        description: `${data.deleted || selectedIds.size} duplicates removed.`,
      })
      await loadDuplicates()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete duplicates',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setIsConfirmOpen(false)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">Duplicate Questions</h1>
              <p className="text-text-light">Review duplicates and delete safely.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadDuplicates} className="gap-2">
                <RefreshCw size={16} />
                Refresh
              </Button>
              <Link href="/admin/questions">
                <Button variant="outline">Back to Questions</Button>
              </Link>
            </div>
          </div>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="Filter by subject code (e.g. ACC)"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              />
              <Input
                placeholder="Filter by chapter code (optional)"
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
              />
              <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={selectedIds.size === 0 || isDeleting}
                    className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-error-red">Delete Selected Questions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to delete {selectedIds.size} duplicate question{selectedIds.size === 1 ? '' : 's'}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteSelected}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Selected'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary-green" size={32} />
            </div>
          ) : groups.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center text-text-light">
                No duplicate questions found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groups.map((group, index) => (
                <Card key={index} className="border border-border">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Duplicate Set ({group.count})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {group.items.map((item, idx) => {
                      const correctKey =
                        item.correctAnswers && item.correctAnswers.length > 0
                          ? item.correctAnswers.join(', ')
                          : typeof item.correctAnswer === 'number'
                            ? String(item.correctAnswer + 1)
                            : '--'
                      return (
                        <div key={item.id} className="border border-border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-text-light">
                              {item.subject} {item.chapter ? `• ${item.chapter}` : ''} • {new Date(item.createdAt).toLocaleString()}
                            </div>
                            <label className="text-xs flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelect(item.id)}
                              />
                              Delete
                            </label>
                          </div>
                          <div className="font-medium text-text-dark">{item.question}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-light">
                            {item.options.map((opt, optIdx) => (
                              <div key={optIdx}>
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-text-light">
                            Correct: {correctKey}
                          </div>
                          {item.explanation && (
                            <div className="text-xs text-text-light italic">
                              Explanation: {item.explanation}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
