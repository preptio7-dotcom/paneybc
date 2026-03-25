'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export default function StudyPlannerPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [authToastShown, setAuthToastShown] = useState(false)
  const [examDate, setExamDate] = useState('')
  const [startTime, setStartTime] = useState('19:00')
  const [planName, setPlanName] = useState('Daily Study Plan')
  const [dailyMinutes, setDailyMinutes] = useState(60)

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to access the study planner.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  useEffect(() => {
    const today = new Date()
    const defaultDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    setExamDate(defaultDate.toISOString().slice(0, 10))
  }, [])

  const handleDownload = () => {
    const params = new URLSearchParams({
      name: planName,
      date: examDate,
      time: startTime,
      minutes: String(dailyMinutes),
    })
    window.location.href = `/api/study-plan/ics?${params.toString()}`
  }

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
            <p className="text-text-light text-sm">Please log in to access the study planner.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="font-heading text-3xl font-bold text-text-dark">Study Planner</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
        <Card className="border border-border">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Exam Date</Label>
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Daily Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Daily Minutes</Label>
                <Input type="number" min="15" value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value) || 60)} />
              </div>
            </div>
            <Button onClick={handleDownload}>Download Calendar (.ics)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
