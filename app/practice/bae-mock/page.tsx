'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2, Minus, Plus } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'

type ConfigPayload = {
  success: boolean
  canStart: boolean
  availability: {
    vol1: number
    vol2: number
    total: number
  }
  defaults: {
    totalQuestions: number
    timeAllowedMinutes: number
  }
  errorMessage: string | null
}

function clampQuestionCount(value: number) {
  return Math.max(10, Math.min(100, Math.round(value / 5) * 5))
}

export default function BaeMockConfigurationPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()

  const [config, setConfig] = useState<ConfigPayload | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [questionCount, setQuestionCount] = useState(50)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) {
      setIsLoadingConfig(false)
      return
    }

    const fetchConfig = async () => {
      try {
        setIsLoadingConfig(true)
        const response = await fetch('/api/bae-mock/config', { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load configuration')
        }
        setConfig(data)
        setQuestionCount(clampQuestionCount(Number(data?.defaults?.totalQuestions) || 50))
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load BAE mock configuration.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingConfig(false)
      }
    }

    void fetchConfig()
  }, [loading, user, toast])

  const timeAllowedMinutes = useMemo(() => Math.ceil((questionCount * 90) / 60), [questionCount])
  const lessThanRecommended = questionCount < 20
  const canStart = Boolean(config?.canStart)

  const handleAdjustQuestions = (delta: number) => {
    setQuestionCount((prev) => clampQuestionCount(prev + delta))
  }

  const handleStart = async () => {
    if (!canStart) return

    try {
      setIsStarting(true)
      setWarningMessage(null)
      const response = await fetch('/api/bae-mock/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalQuestions: questionCount }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Could not start BAE mock test.')
      }

      if (data.warning) {
        setWarningMessage(String(data.warning))
      }

      router.push(`/practice/bae-mock/test?sessionId=${encodeURIComponent(data.sessionId)}`)
    } catch (error: any) {
      toast({
        title: 'Unable to start test',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={32} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="pt-24 px-4">
          <Card className="max-w-xl mx-auto rounded-2xl border border-slate-200">
            <CardContent className="p-8 text-center space-y-4">
              <h1 className="text-2xl font-bold text-slate-900">Login required</h1>
              <p className="text-slate-600">
                Please log in to start the BAE mock test and track your performance across both volumes.
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => router.push('/auth/login')}>Log In</Button>
                <Button variant="outline" onClick={() => router.push('/auth/signup')}>
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <Card className="mx-auto max-w-[600px] rounded-3xl border border-slate-200 shadow-sm">
          <CardContent className="p-6 md:p-8">
            {isLoadingConfig ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-primary-green" size={30} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#16a34a,#2563eb)] text-white shadow-lg">
                    <BookOpen size={36} />
                  </div>
                  <span className="mt-4 inline-flex rounded-full border border-[#86efac] bg-[#dcfce7] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#166534]">
                    ICAP Exam Pattern
                  </span>
                  <h1 className="mt-4 text-3xl font-black text-slate-900">BAE Mock Test</h1>
                  <p className="mt-1 text-sm text-slate-500">Business &amp; Economic Insights Vol I + Vol II</p>
                </div>

                <div className="rounded-2xl border border-[#86efac] bg-[#f0fdf4] p-4">
                  <p className="text-xs font-bold text-[#166534]">Based on Real ICAP Exam Data</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#166534]/90">
                    Student reports show Vol II questions are always equal to or more than Vol I - never less.
                    This mock test follows the same pattern every time.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">Question Mix</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[40%] bg-[#16a34a] float-left" />
                    <div className="h-full w-[60%] bg-[#2563eb] float-left" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-[#166534]">Vol I - ITB</span>
                    <span className="text-[#1d4ed8]">Vol II - ECO</span>
                  </div>
                  <p className="mt-1 text-center text-[11px] italic text-slate-400">
                    Exact ratio randomizes each attempt - just like real ICAP.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Number of Questions</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => handleAdjustQuestions(-5)}
                    >
                      <Minus size={16} />
                    </Button>
                    <div className="min-w-[96px] rounded-xl border border-slate-200 bg-white px-5 py-2 text-center text-xl font-black text-slate-900">
                      {questionCount}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => handleAdjustQuestions(5)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  <p className="text-center text-xs text-slate-400">
                    Default: 50 questions (matches real ICAP paper)
                  </p>
                </div>

                <div className="rounded-xl border border-[#fcd34d] bg-[#fef9c3] px-4 py-3 text-sm font-semibold text-[#854d0e]">
                  Time Allowed: {timeAllowedMinutes} minutes
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">Exam Rules</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                    <li>Timer starts immediately and cannot be paused.</li>
                    <li>All questions are MCQ and shuffled.</li>
                    <li>Mix of Vol I (ITB) and Vol II (ECO) in every attempt.</li>
                    <li>Vol II always matches or exceeds Vol I based on historical data.</li>
                    <li>Results are shown right after submission.</li>
                  </ul>
                </div>

                {config?.availability ? (
                  <p className="text-xs text-slate-500 text-center">
                    Available right now - Vol I: {config.availability.vol1} · Vol II: {config.availability.vol2}
                  </p>
                ) : null}

                {lessThanRecommended ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    We recommend at least 20 questions for a meaningful mock test.
                  </div>
                ) : null}

                {warningMessage ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                    {warningMessage}
                  </div>
                ) : null}

                {!canStart ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {config?.errorMessage || 'Cannot start BAE Mock Test right now.'}
                  </div>
                ) : null}

                <Button
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#16a34a,#2563eb)] py-6 text-base font-bold text-white shadow-[0_4px_14px_rgba(22,163,74,0.3)] hover:brightness-110 hover:-translate-y-0.5 transition-all"
                  onClick={handleStart}
                  disabled={!canStart || isStarting}
                >
                  {isStarting ? 'Starting...' : 'Start BAE Mock Test'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
