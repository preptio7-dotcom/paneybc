'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [authToastShown, setAuthToastShown] = useState(false)
  const [prediction, setPrediction] = useState<any>(null)
  const [timeStats, setTimeStats] = useState<any>(null)
  const [mistakes, setMistakes] = useState<any>(null)

  useEffect(() => {
    if (authLoading || !user?.id) return
    const load = async () => {
      const [predRes, timeRes, mistakeRes] = await Promise.all([
        fetch(`/api/analytics/prediction?userId=${user.id}`),
        fetch(`/api/analytics/time-management?userId=${user.id}`),
        fetch(`/api/analytics/mistakes?userId=${user.id}`),
      ])

      if (predRes.ok) setPrediction(await predRes.json())
      if (timeRes.ok) setTimeStats(await timeRes.json())
      if (mistakeRes.ok) setMistakes(await mistakeRes.json())
    }
    load()
  }, [authLoading, user?.id])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to view your analytics.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="animate-spin text-primary-green">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">Login required</p>
            <p className="text-text-light text-sm">Please log in to view analytics.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.assign('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => window.location.assign('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="font-heading text-3xl font-bold text-text-dark">Performance Analytics</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="border border-border">
          <CardContent className="p-6 space-y-2">
            <h2 className="font-heading text-xl font-bold">Performance Prediction</h2>
            <p className="text-text-light">
              Predicted score: <span className="font-bold text-primary-green">{prediction?.prediction ?? '--'}%</span>
            </p>
            <p className="text-xs text-text-light">Avg: {prediction?.avg ?? '--'}%, Trend: {prediction?.trend ?? '--'}%</p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold">Time Management</h2>
            <p className="text-text-light">Avg time per question: {timeStats?.avgTimePerQuestion ?? '--'} sec</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(timeStats?.subjectStats || []).map((stat: any) => (
                <div key={stat.subject} className="border border-border rounded-lg p-3">
                  <p className="text-sm font-semibold">{stat.subject}</p>
                  <p className="text-xs text-text-light">{stat.avgTime} sec/question</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold">Mistake Patterns</h2>
            <p className="text-text-light">
              Keyword mistakes (NOT/EXCEPT): {mistakes?.keywordMistakes ?? 0} of {mistakes?.keywordAttempts ?? 0}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(mistakes?.weakChapters || []).map((chapter: any) => (
                <div key={chapter.chapter} className="border border-border rounded-lg p-3">
                  <p className="text-sm font-semibold">{chapter.chapter}</p>
                  <p className="text-xs text-text-light">Accuracy: {chapter.accuracy}%</p>
                  <p className="text-xs text-text-light">Attempts: {chapter.attempts}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
