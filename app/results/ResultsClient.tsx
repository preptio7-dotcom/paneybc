'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ResultsHeader } from '@/components/results-header'
import { PerformanceSummary } from '@/components/performance-summary'
import { AnswerBreakdown } from '@/components/answer-breakdown'
import { ResultsActions } from '@/components/results-actions'
import { AdSlot } from '@/components/ad-slot'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'

interface AnswerDetail {
  questionNumber: number
  questionText: string
  yourAnswer: string
  correctAnswer: string
  isCorrect: boolean
  timeSpent: string
  explanation: string
}

interface ResultData {
  _id: string
  subject: string
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  notAttempted: number
  score: number
  weightedScore?: number
  weightedTotal?: number
  weightedPercent?: number
  passed: boolean
  duration: number
  createdAt: string
}

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m 0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [authToastShown, setAuthToastShown] = useState(false)

  const [result, setResult] = useState<ResultData | null>(null)
  const [answers, setAnswers] = useState<AnswerDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [adsLoaded, setAdsLoaded] = useState(false)
  const [adContent, setAdContent] = useState<any>({
    results: {
      headline: 'Boost your score with targeted mock reviews',
      body: 'Short, focused revision plans built for CA students?improve accuracy before your next exam.',
      cta: 'See plans',
      href: '#',
    },
  })

  const resultId = useMemo(() => searchParams.get('id'), [searchParams])

  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true)

        if (authLoading || !user) {
          setIsLoading(false)
          return
        }

        if (resultId) {
          const response = await fetch(`/api/results/${resultId}`)
          if (!response.ok) throw new Error('Result not found')
          const data = await response.json()
          setResult(data.result)
          setAnswers(data.answers || [])
          return
        }

        if (!user?.id) {
          setIsLoading(false)
          return
        }

        const listResponse = await fetch(`/api/results?userId=${user.id}`)
        if (!listResponse.ok) throw new Error('Failed to load results')
        const listData = await listResponse.json()
        const latest = listData.results?.[0]

        if (!latest?._id) {
          setIsLoading(false)
          return
        }

        const response = await fetch(`/api/results/${latest._id}`)
        if (!response.ok) throw new Error('Result not found')
        const data = await response.json()
        setResult(data.result)
        setAnswers(data.answers || [])
      } catch (error) {
        setResult(null)
        setAnswers([])
      } finally {
        setIsLoading(false)
      }
    }

    loadResults()
  }, [authLoading, user, resultId, user?.id])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to view results.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  useEffect(() => {
    const loadSettings = async () => {
      const fallbackAds = {
        results: {
          headline: 'Boost your score with targeted mock reviews',
          body: 'Short, focused revision plans built for CA students—improve accuracy before your next exam.',
          cta: 'See plans',
          href: '#',
        },
      }

      try {
        const response = await fetch('/api/public/settings')
        if (!response.ok) {
          setAdsEnabled(false)
          setAdContent(fallbackAds)
          return
        }
        const data = await response.json()
        setAdsEnabled(Boolean(data.adsEnabled))
        setAdContent(data.adContent || fallbackAds)
      } catch (error) {
        setAdsEnabled(false)
        setAdContent(fallbackAds)
      } finally {
        setAdsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <div className="w-full max-w-3xl space-y-6">
          <Card className="w-full">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-text-dark font-semibold">Login required</p>
              <p className="text-text-light text-sm">Please log in to view your results.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
                <Button variant="outline" onClick={() => router.push('/')}>Back to Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <div className="w-full max-w-3xl space-y-6">
          <Card className="w-full">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-text-dark font-semibold">No results available yet.</p>
              <p className="text-text-light text-sm">Take a test to see your performance summary.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => router.push('/subjects')}>Start a Test</Button>
              </div>
            </CardContent>
          </Card>
          {adsLoaded && adsEnabled && adContent?.results && (
            <AdSlot
              placement="results"
              headline={adContent.results.headline}
              body={adContent.results.body}
              cta={adContent.results.cta}
              href={adContent.results.href}
            />
          )}
        </div>
      </div>
    )
  }

  const percentage = typeof result.weightedPercent === 'number'
    ? result.weightedPercent
    : Math.round((result.correctAnswers / Math.max(1, result.totalQuestions)) * 100)
  const dateText = new Date(result.createdAt).toLocaleDateString()

  return (
    <main className="min-h-screen bg-background-light">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ResultsHeader
          score={result.correctAnswers}
          totalQuestions={result.totalQuestions}
          percentage={percentage}
          isPassed={result.passed}
          timeSpent={formatDuration(result.duration)}
          subject={result.subject}
          date={dateText}
        />

        <PerformanceSummary
          correctAnswers={result.correctAnswers}
          wrongAnswers={result.wrongAnswers}
          notAttempted={result.notAttempted}
          accuracy={percentage}
        />

        {adsLoaded && adsEnabled && adContent?.results && (
          <div className="my-8">
            <AdSlot
              placement="results"
              headline={adContent.results.headline}
              body={adContent.results.body}
              cta={adContent.results.cta}
              href={adContent.results.href}
            />
          </div>
        )}

        <AnswerBreakdown
          answers={answers.filter((answer) => !answer.isCorrect)}
          title="WRONG ANSWERS REVIEW"
          emptyMessage="Great job! You didn't miss any questions in this test."
          alwaysExpanded
        />

        <ResultsActions
          onPracticeAgain={() => router.push('/subjects')}
          onTryDifferentSubject={() => router.push('/subjects')}
          onReturnToDashboard={() => router.push('/dashboard')}
        />
      </div>
    </main>
  )
}
