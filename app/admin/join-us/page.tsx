'use client'

import React, { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function JoinUsAdminPage() {
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [active, setActive] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [replyStatus, setReplyStatus] = useState<'reviewed' | 'replied'>('reviewed')
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/join-us?limit=50')
      const data = await res.json()
      if (res.ok) setSubmissions(data.submissions || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load submissions.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const openReply = (submission: any) => {
    setActive(submission)
    setReplyMessage(submission.adminReply || '')
    setReplyStatus(submission.status === 'replied' ? 'replied' : 'reviewed')
  }

  const handleSend = async () => {
    if (!active) return
    if (replyStatus === 'replied' && !replyMessage.trim()) {
      toast({ title: 'Reply required', description: 'Please enter a reply message.', variant: 'destructive' })
      return
    }
    setIsSending(true)
    try {
      const targetId = active.id ?? active._id
      const res = await fetch(`/api/admin/join-us/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage, status: replyStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reply')
      setSubmissions((prev) => prev.map((s) => ((s.id ?? s._id) === targetId ? data.submission : s)))
      setActive(null)
      toast({
        title: replyStatus === 'replied' ? 'Reply sent' : 'Marked as reviewed',
        description: replyStatus === 'replied' ? 'Email sent to the user.' : 'Submission updated.',
      })
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
      const targetId = deleteTarget.id ?? deleteTarget._id
      const res = await fetch(`/api/admin/join-us/${targetId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      setSubmissions((prev) => prev.filter((s) => (s.id ?? s._id) !== targetId))
      setDeleteTarget(null)
      setDeleteConfirm('')
      toast({ title: 'Deleted', description: 'Submission removed.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete.', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">Join Us Submissions</h1>
            <p className="text-text-light">Review and reply to submissions.</p>
          </div>

          <Card className="border-border">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary-green" size={28} /></div>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-text-light">No submissions yet.</p>
              ) : (
                <div className="space-y-4">
                  {submissions.map((item, idx) => (
                    <div key={item.id ?? item._id ?? `${item.email ?? 'submission'}-${idx}`} className="border border-border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:justify-between gap-3">
                        <div>
                          <p className="text-xs text-text-light">{new Date(item.createdAt).toLocaleString()} ? {item.email}</p>
                          <p className="font-semibold text-text-dark">{item.type}</p>
                          <p className="text-sm text-text-light">{item.message || 'No message'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-bold text-primary-green">{item.status || 'new'}</span>
                          <Button variant="outline" size="sm" onClick={() => openReply(item)}>Reply</Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item)}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Submission</DialogTitle>
            <DialogDescription>Send a response to the user.</DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-background-light p-3 text-sm">
                <p className="text-xs text-text-light">{active.email}</p>
                <p className="font-semibold">{active.type}</p>
                <p className="text-sm mt-2">{active.message || 'No message'}</p>
              </div>
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
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={handleSend} disabled={isSending}>{isSending ? 'Sending...' : 'Send Reply'}</Button>
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
            <DialogTitle>Delete submission?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border border-border bg-background-light p-3 text-sm">
              <p className="text-xs text-text-light">{deleteTarget.email}</p>
              <p className="font-semibold">{deleteTarget.type}</p>
              <p className="text-sm mt-2">{deleteTarget.message || 'No message'}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Type DELETE to confirm
            </label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
            />
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
