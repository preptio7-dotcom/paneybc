'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCcw, Search } from 'lucide-react'
import { parseAmbassadorAnswers } from '@/lib/ambassador-application'

type JoinUsStatus = 'new' | 'reviewed' | 'replied'

type JoinUsSubmission = {
  id: string
  type: string
  name: string
  email: string
  phone: string | null
  institute: string | null
  role: string | null
  experience: string | null
  message: string | null
  status: JoinUsStatus
  adminReply: string | null
  repliedAt: string | null
  createdAt: string
  updatedAt: string
}

function statusBadgeClass(status: JoinUsStatus) {
  if (status === 'new') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (status === 'reviewed') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

function statusLabel(status: JoinUsStatus) {
  if (status === 'new') return 'New'
  if (status === 'reviewed') return 'Reviewed'
  return 'Replied'
}

export default function JoinUsAdminPage() {
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<JoinUsSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [active, setActive] = useState<JoinUsSubmission | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JoinUsSubmission | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [replyStatus, setReplyStatus] = useState<'reviewed' | 'replied'>('reviewed')
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | JoinUsStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [newAmbassadorCount, setNewAmbassadorCount] = useState(0)

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.set('limit', '100')
      params.set('type', 'ambassador')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery.trim()) params.set('q', searchQuery.trim())

      const res = await fetch(`/api/admin/join-us?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load ambassador applications')
      }

      setSubmissions(Array.isArray(data.submissions) ? data.submissions : [])
      setTotalCount(Number(data.totalCount || 0))
      setNewAmbassadorCount(Number(data.newAmbassadorCount || 0))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load submissions.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchSubmissions()
  }, [statusFilter])

  const openReply = (submission: JoinUsSubmission) => {
    setActive(submission)
    setReplyMessage(submission.adminReply || '')
    setReplyStatus(submission.status === 'replied' ? 'replied' : 'reviewed')
  }

  const handleSend = async () => {
    if (!active) return
    if (replyStatus === 'replied' && !replyMessage.trim()) {
      toast({
        title: 'Reply required',
        description: 'Please enter a reply message.',
        variant: 'destructive',
      })
      return
    }

    setIsSending(true)
    try {
      const res = await fetch(`/api/admin/join-us/${active.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: active.id, message: replyMessage, status: replyStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reply')

      setSubmissions((prev) => prev.map((s) => (s.id === active.id ? data.submission : s)))
      setActive(null)

      if (replyStatus === 'replied' && data.emailSent === false) {
        toast({
          title: 'Reply saved, email failed',
          description: data.emailError || 'Check SMTP settings in production.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: replyStatus === 'replied' ? 'Reply sent' : 'Marked as reviewed',
          description: replyStatus === 'replied' ? 'Email sent to the applicant.' : 'Application updated.',
        })
      }

      void fetchSubmissions()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send reply.', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/join-us/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeleteConfirm('')
      toast({ title: 'Deleted', description: 'Application removed.' })
      void fetchSubmissions()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete.', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const activeAnswers = useMemo(() => parseAmbassadorAnswers(active?.message), [active?.message])

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold text-text-dark">Ambassador Applications</h1>
            <p className="text-text-light">
              Review applications submitted from the Ambassador page, including each answer provided by the student.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Total Applications</p>
                <p className="text-2xl font-bold text-text-dark mt-1">{totalCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">New Pending</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{newAmbassadorCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Quick Filters</p>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | JoinUsStatus)}
                    className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="replied">Replied</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => void fetchSubmissions()}>
                    <RefreshCcw size={14} className="mr-1.5" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search Applicants</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative w-full md:max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, phone, or institute"
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => void fetchSubmissions()}>Apply Search</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-primary-green" size={28} />
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-text-light">No ambassador applications found for the selected filters.</p>
              ) : (
                <div className="space-y-4">
                  {submissions.map((item) => {
                    const answers = parseAmbassadorAnswers(item.message)
                    return (
                      <div key={item.id} className="rounded-xl border border-border bg-white p-4 space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-lg font-semibold text-text-dark">{item.name}</p>
                            <p className="text-sm text-text-light">{item.email}</p>
                            <p className="text-xs text-text-light">
                              Applied on {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                                item.status
                              )}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => openReply(item)}>
                              Reply
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item)}>
                              Delete
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Phone</p>
                            <p className="text-sm font-medium text-slate-800 mt-1">{item.phone || '-'}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Institute</p>
                            <p className="text-sm font-medium text-slate-800 mt-1">{item.institute || '-'}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Social Presence</p>
                            <p className="text-sm font-medium text-slate-800 mt-1">{item.role || '-'}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Student Groups</p>
                            <p className="text-sm font-medium text-slate-800 mt-1">{item.experience || '-'}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-text-dark">Application Answers</p>
                          {answers.length === 0 ? (
                            <p className="text-sm text-text-light">{item.message || 'No detailed answers submitted.'}</p>
                          ) : (
                            <div className="space-y-2">
                              {answers.map((answer, index) => (
                                <div key={`${item.id}-answer-${index}`} className="rounded-lg border border-slate-200 p-3">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    {answer.question}
                                  </p>
                                  <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{answer.answer}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Applicant</DialogTitle>
            <DialogDescription>
              Mark this application as reviewed or send an email reply directly to the applicant.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-background-light p-3 text-sm space-y-1">
                <p className="text-xs text-text-light">{active.email}</p>
                <p className="font-semibold text-text-dark">{active.name}</p>
                <p className="text-xs text-text-light">Applied {new Date(active.createdAt).toLocaleString()}</p>
              </div>

              {activeAnswers.length > 0 ? (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-white p-3 space-y-2">
                  {activeAnswers.map((answer, index) => (
                    <div key={`active-answer-${index}`} className="rounded-md border border-slate-200 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{answer.question}</p>
                      <p className="text-sm mt-1 text-slate-800 whitespace-pre-wrap">{answer.answer}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <label className="text-sm font-medium text-gray-700">Reply</label>
              <Textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} className="min-h-[120px]" />
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as 'reviewed' | 'replied')}
                  className="border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="reviewed">Reviewed</option>
                  <option value="replied">Replied</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? 'Sending...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteConfirm('')
          }
        }}
      >
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Delete application?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border border-border bg-background-light p-3 text-sm">
              <p className="text-xs text-text-light">{deleteTarget.email}</p>
              <p className="font-semibold">{deleteTarget.name}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Type DELETE to confirm</label>
            <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null)
                setDeleteConfirm('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirm.trim().toUpperCase() !== 'DELETE'}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
