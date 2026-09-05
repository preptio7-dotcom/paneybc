'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'

type EnrichedReport = {
  id: string
  targetType: 'thread' | 'comment'
  targetId: string
  reporterId: string
  reason: string
  status: 'open' | 'reviewed' | 'resolved'
  createdAt: string
  updatedAt: string
  reporter?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  targetContent?: {
    id: string
    title?: string
    body: string
    authorId?: string
    deleted?: boolean
    threadId?: string
    author?: { id: string; name: string }
    thread?: { id: string; title: string }
  }
}

function timeAgo(dateString: string) {
  const diffMs = Math.max(0, Date.now() - new Date(dateString).getTime())
  const minutes = Math.max(1, Math.floor(diffMs / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AdminCommunityReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = useState<EnrichedReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchReports = async (status: string) => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/admin/community/reports?status=${status}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch reports')
      }
      setReports(data.reports || [])
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load community reports.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports(statusFilter)
  }, [statusFilter])

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setActioningId(reportId)
    try {
      const res = await fetch(`/api/admin/community/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update report status')
      }
      toast({
        title: 'Report Updated',
        description: `Report marked as ${newStatus}.`,
      })
      fetchReports(statusFilter)
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err.message || 'Could not update report.',
        variant: 'destructive',
      })
    } finally {
      setActioningId(null)
    }
  }

  const handleDeleteContent = async (reportId: string) => {
    setActioningId(reportId)
    try {
      const res = await fetch(`/api/admin/community/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_content' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete reported content')
      }
      toast({
        title: 'Content Removed',
        description: 'The reported content was soft-deleted and the report resolved.',
      })
      fetchReports(statusFilter)
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err.message || 'Could not delete reported content.',
        variant: 'destructive',
      })
    } finally {
      setActioningId(null)
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-slate-50 pt-16 pb-12 lg:pt-20 px-3 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-amber-500" />
                Community Reports Queue
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Review user-reported threads and comments, dismiss invalid reports, or soft-delete policy-violating content.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-xs font-semibold text-slate-600">
                Filter:
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" className="w-[140px] bg-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open Reports</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="all">All Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Card List */}
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary-green" />
                <span>Loading report queue...</span>
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-500">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <p className="font-semibold text-slate-800 text-base">No reports found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {statusFilter === 'open'
                    ? 'All clean! There are no open moderation reports at this time.'
                    : `No reports matching status "${statusFilter}".`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const isThread = report.targetType === 'thread'
                const threadId = isThread
                  ? report.targetId
                  : report.targetContent?.threadId || report.targetContent?.thread?.id
                const isDeleted = report.targetContent?.deleted

                return (
                  <Card key={report.id} className="overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
                    <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={
                              isThread
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100'
                            }
                          >
                            {isThread ? 'Thread Report' : 'Comment Report'}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={
                              report.status === 'open'
                                ? 'border-amber-400 bg-amber-50 text-amber-800 font-bold'
                                : 'border-slate-300 bg-white text-slate-700'
                            }
                          >
                            Status: {report.status}
                          </Badge>

                          {isDeleted && (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                              Content Soft-Deleted
                            </Badge>
                          )}
                        </div>

                        <span className="text-xs text-slate-400 font-medium">
                          Reported {timeAgo(report.createdAt)}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 sm:p-5 space-y-4">
                      {/* Reporter Info & Reason */}
                      <div className="rounded-lg bg-amber-50/60 border border-amber-200/80 p-3 text-xs text-amber-950 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-amber-700" />
                            Reported by: {report.reporter?.name || 'Anonymous User'} ({report.reporter?.email || 'No Email'})
                          </span>
                        </div>
                        <p className="text-slate-800 text-sm font-medium pt-1">
                          <strong className="text-amber-900">Reason:</strong> &ldquo;{report.reason}&rdquo;
                        </p>
                      </div>

                      {/* Reported Content Preview */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                          <span className="font-semibold text-slate-700">
                            Target Content ({isThread ? 'Thread' : 'Comment'})
                          </span>
                          {report.targetContent?.author && (
                            <span>Author: <strong className="text-slate-800">{report.targetContent.author.name}</strong></span>
                          )}
                        </div>

                        {report.targetContent ? (
                          <div className="space-y-1 text-sm text-slate-800">
                            {isThread && report.targetContent.title && (
                              <h3 className="font-bold text-slate-900 text-base">
                                {report.targetContent.title}
                              </h3>
                            )}
                            {!isThread && report.targetContent.thread?.title && (
                              <p className="text-xs text-slate-500 italic">
                                Thread: &ldquo;{report.targetContent.thread.title}&rdquo;
                              </p>
                            )}
                            <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed bg-slate-50/80 p-3 rounded-md border border-slate-100 max-h-48 overflow-y-auto">
                              {report.targetContent.body}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            [Content details unavailable or missing]
                          </p>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        {threadId ? (
                          <a
                            href={`/community?thread=${threadId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-green hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View in context
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">Context unavailable</span>
                        )}

                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                          {report.status !== 'resolved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actioningId === report.id}
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                              Dismiss Report
                            </Button>
                          )}

                          {!isDeleted && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={actioningId === report.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                  Delete Content
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Soft-delete this content?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark the reported {isThread ? 'thread' : 'comment'} as deleted (`deleted: true`), create an audit log entry in community moderation actions, and mark this report as resolved.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteContent(report.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Confirm Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
