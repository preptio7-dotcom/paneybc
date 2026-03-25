'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

interface ReportQuestionButtonProps {
  questionId: string
  subject?: string
  questionNumber?: number
}

export function ReportQuestionButton({ questionId, subject, questionNumber }: ReportQuestionButtonProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to report a question.',
        variant: 'destructive',
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: 'Add details',
        description: 'Please briefly describe the issue.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/questions/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          reason,
          subject,
          questionNumber,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send report')
      }

      toast({
        title: 'Report received',
        description: 'We have received your report and will review it soon.',
      })
      setReason('')
      setOpen(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Report Question
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Report Question</DialogTitle>
          <DialogDescription>
            Let us know what seems incorrect. We will review and get back to you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Issue details</label>
          <Textarea
            placeholder="Example: The correct option should be C because..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[120px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
