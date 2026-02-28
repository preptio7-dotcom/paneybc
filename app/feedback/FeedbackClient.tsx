'use client'

import { useEffect, useMemo, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Star } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

type FeedbackForm = {
  rating: number
  message: string
}

type FeedbackStatus = 'pending' | 'approved'

const initialForm: FeedbackForm = {
  rating: 0,
  message: '',
}

export default function FeedbackClient() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const source = useMemo(() => searchParams.get('source') || 'manual', [searchParams])
  const [form, setForm] = useState<FeedbackForm>(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [status, setStatus] = useState<FeedbackStatus>('pending')

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const loadFeedback = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/user/feedback')
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load feedback')
        }

        if (data.feedback) {
          setForm({
            rating: Number(data.feedback.rating) || 0,
            message: String(data.feedback.message || ''),
          })
          setUpdatedAt(data.feedback.updatedAt || data.feedback.createdAt || null)
          setStatus((data.feedback.status as FeedbackStatus) || 'pending')
          setHasSubmitted(true)
        } else {
          setForm(initialForm)
          setHasSubmitted(false)
          setUpdatedAt(null)
          setStatus('pending')
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Unable to load your feedback.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadFeedback()
  }, [user?.id])

  const handleSave = async () => {
    if (!form.rating || form.rating < 1 || form.rating > 5) {
      toast({
        title: 'Rating required',
        description: 'Please select a rating from 1 to 5 stars.',
        variant: 'destructive',
      })
      return
    }
    if (!form.message.trim()) {
      toast({
        title: 'Feedback required',
        description: 'Please write your feedback before submitting.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/feedback', {
        method: hasSubmitted ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: form.rating,
          message: form.message,
          source,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save feedback')
      }

      setHasSubmitted(true)
      setUpdatedAt(data.feedback?.updatedAt || null)
      setStatus((data.feedback?.status as FeedbackStatus) || 'pending')
      toast({
        title: hasSubmitted ? 'Feedback updated' : 'Feedback submitted',
        description: 'Thank you for sharing your feedback.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not save your feedback.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background-light">
        <Navigation />
        <div className="pt-24 pb-16 px-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary-green" size={32} />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light">
        <Navigation />
        <div className="pt-24 pb-16 px-6 max-w-xl mx-auto">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Login Required</CardTitle>
              <CardDescription>Please login to share feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.assign('/auth/login?next=/feedback')}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-dark">Share Feedback</h1>
          <p className="text-text-light">
            {hasSubmitted
              ? 'You can edit your previous feedback anytime.'
              : 'Tell us what is working and what we should improve.'}
          </p>
          {updatedAt ? (
            <p className="text-xs text-slate-500 mt-1">
              Last updated: {new Date(updatedAt).toLocaleString()}
            </p>
          ) : null}
          {hasSubmitted ? (
            <p className="text-xs mt-1 text-slate-500">
              Review status:{' '}
              <span className={status === 'approved' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                {status}
              </span>
            </p>
          ) : null}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>{hasSubmitted ? 'Manage Your Feedback' : 'Your Feedback'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your Rating *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, rating: star }))}
                    className="p-1"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      size={22}
                      className={star <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                    />
                  </button>
                ))}
                <span className="text-xs text-slate-500">
                  {form.rating ? `${form.rating}/5` : 'Select rating'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Feedback Message *</label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                className="min-h-[150px]"
                placeholder="Share your honest experience with Preptio..."
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : hasSubmitted ? 'Update Feedback' : 'Submit Feedback'}
              </Button>
              <Button variant="outline" onClick={() => window.location.assign('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
