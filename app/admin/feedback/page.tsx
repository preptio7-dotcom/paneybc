'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
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

type FeedbackStatus = 'pending' | 'approved'
type FeedbackRow = {
  id: string
  rating: number
  message: string
  status: FeedbackStatus
  createdAt: string
  user: {
    name: string
    city: string
    level: string
    email: string
  }
}

export default function AdminFeedbackPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const loadFeedback = async () => {
    try {
      setIsLoading(true)
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      const response = await fetch(`/api/admin/feedback${query}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load feedback')
      }
      setRows(data.feedback || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to load feedback.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFeedback()
  }, [statusFilter])

  const counts = useMemo(() => {
    const pending = rows.filter((item) => item.status === 'pending').length
    const approved = rows.filter((item) => item.status === 'approved').length
    return { total: rows.length, pending, approved }
  }, [rows])

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update feedback')
      }
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
      toast({
        title: 'Updated',
        description: `Feedback marked as ${status}.`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to update feedback.',
        variant: 'destructive',
      })
    }
  }

  const deleteFeedback = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete feedback')
      }
      setRows((prev) => prev.filter((row) => row.id !== id))
      toast({
        title: 'Deleted',
        description: 'Feedback deleted successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to delete feedback.',
        variant: 'destructive',
      })
    } finally {
      setPendingDeleteId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">Student Feedback</h1>
              <p className="text-text-light">
                Approve, reject, or delete feedback shown on the homepage.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
              >
                All ({counts.total})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
              >
                Pending ({counts.pending})
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('approved')}
              >
                Approved ({counts.approved})
              </Button>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Feedback Submissions</CardTitle>
              <CardDescription>
                New entries are pending by default and become visible after approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px] px-4 py-3">Student</TableHead>
                    <TableHead className="min-w-[140px] px-4 py-3">City</TableHead>
                    <TableHead className="min-w-[120px] px-4 py-3">Rating</TableHead>
                    <TableHead className="min-w-[360px] px-4 py-3">Message</TableHead>
                    <TableHead className="min-w-[140px] px-4 py-3">Submitted</TableHead>
                    <TableHead className="min-w-[120px] px-4 py-3">Status</TableHead>
                    <TableHead className="min-w-[270px] px-4 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-8 text-center text-text-light">
                        Loading feedback...
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-8 text-center text-text-light">
                        No feedback found for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="px-4 py-4 align-top">
                          <div>
                            <p className="font-semibold text-text-dark">{row.user?.name || 'Student'}</p>
                            <p className="text-xs text-text-light">{row.user?.email || '-'}</p>
                            {row.user?.level ? (
                              <p className="text-xs text-slate-500 mt-1">Level: {row.user.level}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-text-dark">
                          {row.user?.city || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-text-dark">
                          {row.rating}/5
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top whitespace-normal">
                          <p className="text-sm text-text-dark line-clamp-2">
                            {row.message}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-text-light">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top">
                          <Badge
                            variant={row.status === 'approved' ? 'default' : 'outline'}
                            className={row.status === 'approved' ? 'bg-primary-green text-white' : ''}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={row.status === 'approved'}
                              onClick={() => updateStatus(row.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={row.status === 'pending'}
                              onClick={() => updateStatus(row.id, 'pending')}
                            >
                              Reject
                            </Button>
                            <AlertDialog
                              open={pendingDeleteId === row.id}
                              onOpenChange={(open) => setPendingDeleteId(open ? row.id : null)}
                            >
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete feedback permanently?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this feedback? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteFeedback(row.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
