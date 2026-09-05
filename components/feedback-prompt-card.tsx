'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackPromptCardProps {
  source?: string
  className?: string
}

export function FeedbackPromptCard({ source = 'test-completion', className }: FeedbackPromptCardProps) {
  const [loading, setLoading] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/user/feedback', { cache: 'no-store' })
        if (!response.ok) {
          if (mounted) setShowPrompt(false)
          return
        }
        const data = await response.json()
        if (mounted) {
          setShowPrompt(!Boolean(data?.hasSubmitted))
        }
      } catch {
        if (mounted) setShowPrompt(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStatus()
    return () => {
      mounted = false
    }
  }, [])

  const feedbackHref = useMemo(
    () => `/feedback?source=${encodeURIComponent(source)}`,
    [source]
  )

  if (loading || !showPrompt) return null

  return (
    <Card className={cn('border border-primary-green/20 bg-primary-green/5', className)}>
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-1 text-primary-green" size={18} />
          <div>
            <p className="font-semibold text-text-dark">Share your feedback</p>
            <p className="text-sm text-text-light">
              Help us improve Preptio by sharing your experience.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={feedbackHref}>Share Feedback</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
