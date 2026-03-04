'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, Info, Loader2, Trophy, XCircle } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import { SUBJECT_TEST_MODES } from '@/lib/practice-modes'
import { BAE_VOL1_CODE, BAE_VOL2_CODE } from '@/lib/bae-mock'

type SessionSummary = {
  id: string
  completed: boolean
  totalQuestions: number
  timeAllowed: number
  timeTaken: number | null
  vol1Count: number
  vol2Count: number
  vol1Correct: number
  vol2Correct: number
  correctAnswers: number
  wrongAnswers: number
  notAttempted: number
  scorePercent: number
}

type WeakAreaPayload = {
  success: boolean
  attemptCount: number
  unlocked: boolean
  remainingForUnlock: number
  totals: {
    vol1Questions: number
    vol2Questions: number
    vol1Correct: number
    vol2Correct: number
  }
  accuracy: {
    vol1: number
    vol2: number
  }
  comparison: {
    difference: number
    weakerVolume: 'VOL1' | 'VOL2' | null
    strongerVolume: 'VOL1' | 'VOL2' | null
    balanced: boolean
  }
  history: Array<{
    id: string
    date: string
    scorePercent: number
    scoreText: string
    ratioText: string
    vol1Accuracy: number
    vol2Accuracy: number
    improvementDelta: number
    timeTaken: number
    timeAllowed: number
  }>
}

function accuracy(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

function formatDuration(seconds: number | null | undefined) {
  const safe = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${minutes}m ${remaining}s`
}

export default function BaeMockResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [weakArea, setWeakArea] = useState<WeakAreaPayload | null>(null)

  useEffect(() => {
    if (loading || !user) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)

        const [sessionRes, weakRes] = await Promise.all([
          fetch(`/api/bae-mock/session/${encodeURIComponent(String(sessionId || ''))}`, {
            cache: 'no-store',
          }),
          fetch('/api/bae-mock/weak-area', { cache: 'no-store' }),
        ])

        const sessionData = await sessionRes.json()
        if (!sessionRes.ok) {
          throw new Error(sessionData.error || 'Failed to load result')
        }

        if (!sessionData.session?.completed) {
          router.replace(`/practice/bae-mock/test?sessionId=${encodeURIComponent(String(sessionId || ''))}`)
          return
        }

        setSession(sessionData.session)

        if (weakRes.ok) {
          const weakData = await weakRes.json()
          setWeakArea(weakData)
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Could not load BAE mock result.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [loading, router, sessionId, toast, user])

  const vol1Accuracy = useMemo(
    () => accuracy(session?.vol1Correct || 0, session?.vol1Count || 0),
    [session?.vol1Correct, session?.vol1Count]
  )
  const vol2Accuracy = useMemo(
    () => accuracy(session?.vol2Correct || 0, session?.vol2Count || 0),
    [session?.vol2Correct, session?.vol2Count]
  )

  const ratioInsight = useMemo(() => {
    if (!session) return ''
    if (session.vol2Count > session.vol1Count) {
      return `Vol II had ${session.vol2Count - session.vol1Count} more questions than Vol I in this attempt.`
    }
    return 'Equal split - both volumes had the same number of questions.'
  }, [session])

  const performanceInsight = useMemo(() => {
    if (!session) return { tone: 'balanced', text: '' }
    const diff = Math.abs(vol1Accuracy - vol2Accuracy)
    if (diff <= 15) {
      return {
        tone: 'balanced',
        text: 'Great balance! Your performance is consistent across both volumes.',
      }
    }
    if (vol1Accuracy > vol2Accuracy) {
      return {
        tone: 'vol2',
        text: "You're stronger in Vol I (ITB). Give extra practice to Vol II - ECO topics.",
      }
    }
    return {
      tone: 'vol1',
      text: "You're stronger in Vol II (ECO). Give extra attention to Vol I - ITB topics.",
    }
  }, [session, vol1Accuracy, vol2Accuracy])

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={34} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="pt-24 px-4">
          <Card className="mx-auto max-w-lg rounded-2xl border border-slate-200">
            <CardContent className="p-8 text-center space-y-3">
              <h1 className="text-2xl font-bold text-slate-900">Login required</h1>
              <p className="text-slate-600">Please log in to view your BAE mock result.</p>
              <Button onClick={() => router.push('/auth/login')}>Log In</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="pt-24 px-4">
          <Card className="mx-auto max-w-lg rounded-2xl border border-slate-200">
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="mx-auto text-slate-400" size={34} />
              <h1 className="text-2xl font-bold text-slate-900">Result unavailable</h1>
              <p className="text-slate-600">This BAE mock result could not be found.</p>
              <Button onClick={() => router.push('/practice/bae-mock')}>Start New Mock Test</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const passed = session.scorePercent >= 50
  const vol1RatioPercent = Math.round((session.vol1Count / Math.max(1, session.totalQuestions)) * 100)
  const vol2RatioPercent = 100 - vol1RatioPercent

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div
            className={`rounded-3xl border-4 p-8 text-center ${
              passed ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50'
            }`}
          >
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {passed ? <Trophy size={38} /> : <XCircle size={38} />}
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-900">{passed ? 'BAE MOCK PASSED' : 'BAE MOCK COMPLETE'}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Score: {session.correctAnswers}/{session.totalQuestions} ({session.scorePercent}%)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border border-slate-200">
              <CardContent className="p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-500">Accuracy</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{session.scorePercent}%</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-slate-200">
              <CardContent className="p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-500">Correct</p>
                <p className="mt-2 text-3xl font-black text-emerald-600">{session.correctAnswers}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-slate-200">
              <CardContent className="p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-500">Time</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{formatDuration(session.timeTaken)}</p>
                <p className="text-[11px] text-slate-500">Allowed: {session.timeAllowed}m</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">This Attempt&apos;s Ratio</h2>
                <div className="group relative">
                  <Info size={16} className="text-slate-400" />
                  <div className="pointer-events-none absolute right-0 top-6 hidden w-64 rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600 shadow-lg group-hover:block">
                    Ratio varies each attempt, just like real ICAP exams. Vol II is always equal to or greater than Vol I.
                  </div>
                </div>
              </div>

              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-[#16a34a] float-left" style={{ width: `${vol1RatioPercent}%` }} />
                <div className="h-full bg-[#2563eb] float-left" style={{ width: `${vol2RatioPercent}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
                <div className="text-center">
                  <p className="text-xs font-bold text-[#166534]">Vol I - ITB</p>
                  <p className="text-4xl font-black text-[#166534]">{session.vol1Count}</p>
                  <p className="text-xs text-slate-500">questions</p>
                </div>
                <p className="text-2xl font-black text-slate-300">/</p>
                <div className="text-center">
                  <p className="text-xs font-bold text-[#1d4ed8]">Vol II - ECO</p>
                  <p className="text-4xl font-black text-[#1d4ed8]">{session.vol2Count}</p>
                  <p className="text-xs text-slate-500">questions</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-700">{ratioInsight}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Performance by Volume</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#86efac] overflow-hidden">
                  <div className="bg-[#dcfce7] px-4 py-2 text-sm font-bold text-[#166534]">Vol I - ITB</div>
                  <div className="p-4 space-y-2">
                    <p className="text-sm text-slate-600">Questions: {session.vol1Count}</p>
                    <p className="text-sm text-slate-600">Correct: {session.vol1Correct}</p>
                    <p className="text-sm font-semibold text-[#166534]">Accuracy: {vol1Accuracy}%</p>
                    <Progress value={vol1Accuracy} className="h-2" />
                  </div>
                </div>
                <div className="rounded-2xl border border-[#bfdbfe] overflow-hidden">
                  <div className="bg-[#dbeafe] px-4 py-2 text-sm font-bold text-[#1d4ed8]">Vol II - ECO</div>
                  <div className="p-4 space-y-2">
                    <p className="text-sm text-slate-600">Questions: {session.vol2Count}</p>
                    <p className="text-sm text-slate-600">Correct: {session.vol2Correct}</p>
                    <p className="text-sm font-semibold text-[#1d4ed8]">Accuracy: {vol2Accuracy}%</p>
                    <Progress value={vol2Accuracy} className="h-2" />
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  performanceInsight.tone === 'balanced'
                    ? 'bg-[#f0fdf4] text-[#166534]'
                    : performanceInsight.tone === 'vol1'
                      ? 'bg-[#fef9c3] text-[#854d0e]'
                      : 'bg-[#eff6ff] text-[#1d4ed8]'
                }`}
              >
                {performanceInsight.text}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Your BAE Weak Area Analysis</h2>
              {weakArea?.unlocked ? (
                <>
                  <p className="text-xs text-slate-500">Based on your last {weakArea.attemptCount} BAE mock attempts.</p>
                  {weakArea.attemptCount === 3 ? (
                    <div className="rounded-xl border border-[#86efac] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]">
                      You have unlocked your BAE Weak Area Analysis.
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800">Vol I - ITB</span>
                        <span className="font-bold text-slate-900">{weakArea.accuracy.vol1}%</span>
                      </div>
                      <Progress value={weakArea.accuracy.vol1} className="h-2.5" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800">Vol II - ECO</span>
                        <span className="font-bold text-slate-900">{weakArea.accuracy.vol2}%</span>
                      </div>
                      <Progress value={weakArea.accuracy.vol2} className="h-2.5" />
                    </div>
                  </div>

                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      weakArea.comparison.difference < 10
                        ? 'bg-[#f0fdf4] text-[#166534]'
                        : weakArea.comparison.difference < 25
                          ? 'bg-[#fef9c3] text-[#854d0e]'
                          : 'bg-[#fee2e2] text-[#991b1b]'
                    }`}
                  >
                    {weakArea.comparison.difference < 10 ? (
                      <p>Well balanced across both volumes.</p>
                    ) : (
                      <p>
                        Focus Area: {weakArea.comparison.weakerVolume === 'VOL1' ? 'Vol I - ITB' : 'Vol II - ECO'}.
                        Accuracy gap is {weakArea.comparison.difference}%.
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4]"
                    onClick={() =>
                      router.push(
                        weakArea.comparison.weakerVolume === 'VOL1'
                          ? `/subjects/${encodeURIComponent(BAE_VOL1_CODE)}/test?mode=${SUBJECT_TEST_MODES.mock}`
                          : weakArea.comparison.weakerVolume === 'VOL2'
                            ? `/subjects/${encodeURIComponent(BAE_VOL2_CODE)}/test?mode=${SUBJECT_TEST_MODES.mock}`
                            : '/practice/bae-mock'
                      )
                    }
                  >
                    {weakArea.comparison.weakerVolume === 'VOL1'
                      ? `Practice ${BAE_VOL1_CODE} Questions`
                      : weakArea.comparison.weakerVolume === 'VOL2'
                        ? `Practice ${BAE_VOL2_CODE} Questions`
                        : 'Take Another BAE Mock Test'}
                    <ArrowRight size={14} className="ml-1" />
                  </Button>
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Complete {weakArea?.remainingForUnlock ?? 3} more BAE mock tests to unlock your weak area analysis.
                </div>
              )}
            </CardContent>
          </Card>

          {weakArea?.history?.length ? (
            <Card className="rounded-3xl border border-slate-200">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">BAE Mock Test History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Score</th>
                        <th className="py-2 pr-3">Ratio</th>
                        <th className="py-2 pr-3">Vol I</th>
                        <th className="py-2 pr-3">Vol II</th>
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weakArea.history.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100">
                          <td className="py-2 pr-3">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="py-2 pr-3">{row.scoreText} ({row.scorePercent}%)</td>
                          <td className="py-2 pr-3">{row.ratioText}</td>
                          <td className="py-2 pr-3">{row.vol1Accuracy}%</td>
                          <td className="py-2 pr-3">{row.vol2Accuracy}%</td>
                          <td className="py-2 pr-3">{Math.round((row.timeTaken / Math.max(1, row.timeAllowed * 60)) * 100)}%</td>
                          <td className="py-2">
                            <span
                              className={
                                row.improvementDelta > 0
                                  ? 'text-emerald-600'
                                  : row.improvementDelta < 0
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                              }
                            >
                              {row.improvementDelta > 0 ? `+${row.improvementDelta}` : row.improvementDelta}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 bg-slate-800 hover:bg-slate-900" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4]"
              onClick={() => router.push('/practice/bae-mock')}
            >
              Take Another BAE Mock Test
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
