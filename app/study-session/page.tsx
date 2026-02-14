'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

export default function StudySessionPage() {
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [authToastShown, setAuthToastShown] = useState(false)
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState<{ totalMinutes: number; daysStudied: number; streak: number } | null>(null)

  useEffect(() => {
    setSecondsLeft(minutes * 60)
  }, [minutes])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const response = await fetch('/api/study-sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
        setStats({ totalMinutes: data.totalMinutes || 0, daysStudied: data.daysStudied || 0, streak: data.streak || 0 })
      }
    }
    load()
  }, [user])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to start a study session.',
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
            <p className="text-text-light text-sm">Please log in to access study sessions.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.assign('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => window.location.assign('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsRunning(false)
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const handleComplete = async () => {
    try {
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, focusMode: 'pomodoro' }),
      })
      if (response.ok) {
        toast({ title: 'Session saved', description: `Logged ${minutes} minutes.` })
        const data = await response.json()
        setSessions((prev) => [data.session, ...prev])
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save session', variant: 'destructive' })
    }
  }

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="font-heading text-3xl font-bold text-text-dark">Study Sessions</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="border border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light uppercase font-bold">Pomodoro</p>
                <p className="text-4xl font-black text-primary-green">{formatTime(secondsLeft)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-text-light">Minutes</label>
                <input
                  type="number"
                  min="5"
                  max="90"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value) || 25)}
                  className="border border-border rounded-md px-3 py-2 w-24"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setIsRunning(true)} disabled={isRunning}>Start</Button>
              <Button variant="outline" onClick={() => setIsRunning(false)}>Pause</Button>
              <Button variant="ghost" onClick={() => setSecondsLeft(minutes * 60)}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-text-light uppercase font-bold">Total Minutes</p>
              <p className="text-2xl font-black text-text-dark">{stats?.totalMinutes || 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-text-light uppercase font-bold">Days Studied</p>
              <p className="text-2xl font-black text-text-dark">{stats?.daysStudied || 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-text-light uppercase font-bold">Streak</p>
              <p className="text-2xl font-black text-text-dark">{stats?.streak || 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border">
          <CardContent className="p-6">
            <h2 className="font-heading text-xl font-bold text-text-dark mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.length === 0 && <p className="text-sm text-text-light">No sessions yet.</p>}
              {sessions.map((session, idx) => (
                <div
                  key={session._id ?? `${session.createdAt ?? 'session'}-${session.minutes ?? idx}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                  <span className="font-semibold">{session.minutes} min</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
