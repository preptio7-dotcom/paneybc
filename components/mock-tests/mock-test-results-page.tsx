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
import {
  BAE_VOL1_CODE,
  BAE_VOL1_NAME,
  BAE_VOL2_CODE,
  BAE_VOL2_NAME,
} from '@/lib/bae-mock'
import { MOCK_TEST_DEFINITIONS, type MockSubjectDefinition, type MockTestRouteKey } from '@/lib/mock-tests'
import { SUBJECT_TEST_MODES } from '@/lib/practice-modes'

type ApiDefinition = {
  routeKey: string
  testType: string
  testName: string
  isCombined: boolean
  subjects: MockSubjectDefinition[]
  gradientFrom: string
  gradientTo: string
}

type SessionSummary = {
  id: string
  completed: boolean
  testType: string
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
  chapterBreakdown?: Record<string, { attempted?: number; correct?: number; accuracy?: number }>
}

type MockQuestion = {
  chapter: string | null
}

type BaeWeakAreaPayload = {
  success: boolean
  attemptCount: number
  unlocked: boolean
  remainingForUnlock: number
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

type SingleWeakAreaPayload = {
  success: boolean
  attemptCount: number
  unlocked: boolean
  remainingForUnlock: number
  chapterLabels?: Record<string, string>
  chapters: Array<{
    chapterCode: string
    chapterLabel?: string
    attempted: number
    correct: number
    accuracy: number
  }>
  history: Array<{
    id: string
    date: string
    scorePercent: number
    scoreText: string
    weakestChapter: string | null
    weakestChapterLabel?: string | null
    weakestAccuracy: number | null
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

function parseChapterBreakdown(
  raw: SessionSummary['chapterBreakdown']
): Record<string, { attempted: number; correct: number; accuracy: number }> {
  if (!raw || typeof raw !== 'object') return {}
  const entries = Object.entries(raw)
  const mapped = entries.map(([chapterCode, row]) => {
    const attempted = Math.max(0, Number(row?.attempted) || 0)
    const correct = Math.max(0, Number(row?.correct) || 0)
    const accuracyValue =
      typeof row?.accuracy === 'number' ? Math.max(0, Number(row.accuracy) || 0) : accuracy(correct, attempted)
    return [chapterCode, { attempted, correct, accuracy: accuracyValue }] as const
  })
  return Object.fromEntries(mapped)
}

function getChapterLabel(
  chapterCode: string,
  chapterLabelByCode: Map<string, string>
) {
  const normalized = String(chapterCode || '').trim()
  if (!normalized) return 'Unmapped'
  return chapterLabelByCode.get(normalized) || normalized
}

export function MockTestResultsPage({ mockKey }: { mockKey: MockTestRouteKey }) {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useAuth()

  const defaultDefinition = MOCK_TEST_DEFINITIONS[mockKey]

  const [isLoading, setIsLoading] = useState(true)
  const [definition, setDefinition] = useState<ApiDefinition | null>(null)
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [questions, setQuestions] = useState<MockQuestion[]>([])
  const [chapterLabels, setChapterLabels] = useState<Record<string, string>>({})
  const [weakArea, setWeakArea] = useState<BaeWeakAreaPayload | SingleWeakAreaPayload | null>(null)

  useEffect(() => {
    if (loading || !user) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)

        const [sessionRes, weakRes] = await Promise.all([
          fetch(`/api/mock-tests/session/${encodeURIComponent(String(sessionId || ''))}`, {
            cache: 'no-store',
          }),
          fetch(`/api/mock-tests/${mockKey}/weak-area`, { cache: 'no-store' }),
        ])

        const sessionData = await sessionRes.json()
        if (!sessionRes.ok) {
          throw new Error(sessionData.error || 'Failed to load result')
        }

        const loadedDefinition = sessionData.definition as ApiDefinition | undefined
        if (loadedDefinition?.routeKey && loadedDefinition.routeKey !== mockKey) {
          router.replace(
            `/practice/${loadedDefinition.routeKey}/results/${encodeURIComponent(String(sessionId || ''))}`
          )
          return
        }

        if (!sessionData.session?.completed) {
          router.replace(`/practice/${mockKey}/test?sessionId=${encodeURIComponent(String(sessionId || ''))}`)
          return
        }

        setDefinition(loadedDefinition || null)
        setSession(sessionData.session as SessionSummary)
        setQuestions(Array.isArray(sessionData.questions) ? (sessionData.questions as MockQuestion[]) : [])
        setChapterLabels(
          sessionData.chapterLabels && typeof sessionData.chapterLabels === 'object'
            ? (sessionData.chapterLabels as Record<string, string>)
            : {}
        )

        if (weakRes.ok) {
          const weakData = await weakRes.json()
          setWeakArea(weakData)
        } else {
          setWeakArea(null)
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Could not load mock result.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [loading, mockKey, router, sessionId, toast, user])

  const effectiveDefinition = definition || {
    routeKey: defaultDefinition.routeKey,
    testType: defaultDefinition.testType,
    testName: defaultDefinition.testName,
    isCombined: defaultDefinition.isCombined,
    subjects: defaultDefinition.subjects,
    gradientFrom: defaultDefinition.gradientFrom,
    gradientTo: defaultDefinition.gradientTo,
  }

  const chapterLabelByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const [code, label] of Object.entries(chapterLabels)) {
      const normalizedCode = String(code || '').trim()
      if (!normalizedCode) continue
      if (!map.has(normalizedCode)) {
        map.set(normalizedCode, String(label || normalizedCode))
      }
      const uppercaseCode = normalizedCode.toUpperCase()
      if (!map.has(uppercaseCode)) {
        map.set(uppercaseCode, String(label || normalizedCode))
      }
    }
    for (const question of questions) {
      const code = String(question.chapter || '').trim()
      if (!code) continue
      if (!map.has(code)) map.set(code, code)
    }
    if (weakArea && !effectiveDefinition.isCombined) {
      const weakAreaLabels = (weakArea as SingleWeakAreaPayload).chapterLabels || {}
      for (const [code, label] of Object.entries(weakAreaLabels)) {
        const normalizedCode = String(code || '').trim()
        if (!normalizedCode) continue
        if (!map.has(normalizedCode)) map.set(normalizedCode, String(label || normalizedCode))
        const uppercaseCode = normalizedCode.toUpperCase()
        if (!map.has(uppercaseCode)) map.set(uppercaseCode, String(label || normalizedCode))
      }
    }
    return map
  }, [chapterLabels, effectiveDefinition.isCombined, questions, weakArea])

  const chapterBreakdownList = useMemo(() => {
    const normalized = parseChapterBreakdown(session?.chapterBreakdown)
    return Object.entries(normalized)
      .map(([chapterCode, stats]) => ({
        chapterCode,
        chapterLabel: getChapterLabel(chapterCode, chapterLabelByCode),
        attempted: stats.attempted,
        correct: stats.correct,
        accuracy: stats.accuracy,
      }))
      .sort((a, b) => b.attempted - a.attempted)
  }, [chapterLabelByCode, session?.chapterBreakdown])

  const weakestChapterFromSession = useMemo(() => {
    if (!chapterBreakdownList.length) return null
    const filtered = chapterBreakdownList.filter((row) => row.attempted > 0)
    if (!filtered.length) return null
    return filtered.slice().sort((a, b) => a.accuracy - b.accuracy)[0]
  }, [chapterBreakdownList])

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
    return 'Equal split — both volumes had the same number of questions.'
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
        text: `You're stronger in ${BAE_VOL1_NAME}. Give extra practice to ${BAE_VOL2_NAME} topics.`,
      }
    }
    return {
      tone: 'vol1',
      text: `You're stronger in ${BAE_VOL2_NAME}. Give extra attention to ${BAE_VOL1_NAME} topics.`,
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
              <p className="text-slate-600">Please log in to view your mock result.</p>
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
              <p className="text-slate-600">This mock result could not be found.</p>
              <Button onClick={() => router.push(`/practice/${mockKey}`)}>Start New Mock Test</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const passed = session.scorePercent >= 50
  const vol1RatioPercent = Math.round((session.vol1Count / Math.max(1, session.totalQuestions)) * 100)
  const vol2RatioPercent = 100 - vol1RatioPercent
  const primaryAccent = effectiveDefinition.subjects[0]?.accentColor || '#16a34a'

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
            <h1 className="mt-4 text-3xl font-black text-slate-900">
              {passed ? `${effectiveDefinition.testName.toUpperCase()} PASSED` : `${effectiveDefinition.testName.toUpperCase()} COMPLETE`}
            </h1>
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

          {effectiveDefinition.isCombined ? (
            <>
              <Card className="rounded-3xl border border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">This Attempt&apos;s Ratio</h2>
                    <div className="group relative">
                      <Info size={16} className="text-slate-400" />
                      <div className="pointer-events-none absolute right-0 top-6 hidden w-64 rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600 shadow-lg group-hover:block">
                        Ratio varies each attempt, just like real ICAP exams. Vol II is always equal to or greater than
                        Vol I.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-[#16a34a] float-left" style={{ width: `${vol1RatioPercent}%` }} />
                    <div className="h-full bg-[#2563eb] float-left" style={{ width: `${vol2RatioPercent}%` }} />
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#166534]">{BAE_VOL1_NAME}</p>
                      <p className="text-4xl font-black text-[#166534]">{session.vol1Count}</p>
                      <p className="text-xs text-slate-500">questions</p>
                    </div>
                    <p className="text-2xl font-black text-slate-300">/</p>
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#1d4ed8]">{BAE_VOL2_NAME}</p>
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
                      <div className="bg-[#dcfce7] px-4 py-2 text-sm font-bold text-[#166534]">{BAE_VOL1_NAME}</div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm text-slate-600">Questions: {session.vol1Count}</p>
                        <p className="text-sm text-slate-600">Correct: {session.vol1Correct}</p>
                        <p className="text-sm font-semibold text-[#166534]">Accuracy: {vol1Accuracy}%</p>
                        <Progress value={vol1Accuracy} className="h-2" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#bfdbfe] overflow-hidden">
                      <div className="bg-[#dbeafe] px-4 py-2 text-sm font-bold text-[#1d4ed8]">{BAE_VOL2_NAME}</div>
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
            </>
          ) : (
            <Card className="rounded-3xl border border-slate-200">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Performance by Chapter</h2>
                {chapterBreakdownList.length ? (
                  <>
                    <div className="space-y-3">
                      {chapterBreakdownList.slice(0, 5).map((row) => (
                        <div key={row.chapterCode} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <p className="font-semibold text-slate-900">{row.chapterLabel}</p>
                            <p className="text-slate-600">
                              {row.correct}/{row.attempted} ({Math.round(row.accuracy)}%)
                            </p>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(0, Math.min(100, row.accuracy))}%`,
                                background: primaryAccent,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {weakestChapterFromSession ? (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                        Chapter {weakestChapterFromSession.chapterLabel} had your lowest accuracy (
                        {Math.round(weakestChapterFromSession.accuracy)}%) in this attempt. Consider focused practice on
                        this chapter.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Chapter performance will appear once chapter-level answers are available in this session.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-3xl border border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                {effectiveDefinition.isCombined
                  ? 'Your BAE Weak Area Analysis'
                  : `Your ${effectiveDefinition.testName.replace(' Mock Test', '')} Weak Area Analysis`}
              </h2>

              {weakArea && weakArea.unlocked ? (
                <>
                  <p className="text-xs text-slate-500">
                    Based on your last {weakArea.attemptCount} {effectiveDefinition.testName} attempts.
                  </p>

                  {weakArea.attemptCount === 3 ? (
                    <div className="rounded-xl border border-[#86efac] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]">
                      You have unlocked your weak area analysis.
                    </div>
                  ) : null}

                  {effectiveDefinition.isCombined ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-800">{BAE_VOL1_NAME}</span>
                            <span className="font-bold text-slate-900">
                              {(weakArea as BaeWeakAreaPayload).accuracy.vol1}%
                            </span>
                          </div>
                          <Progress value={(weakArea as BaeWeakAreaPayload).accuracy.vol1} className="h-2.5" />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-800">{BAE_VOL2_NAME}</span>
                            <span className="font-bold text-slate-900">
                              {(weakArea as BaeWeakAreaPayload).accuracy.vol2}%
                            </span>
                          </div>
                          <Progress value={(weakArea as BaeWeakAreaPayload).accuracy.vol2} className="h-2.5" />
                        </div>
                      </div>

                      <div
                        className={`rounded-xl px-4 py-3 text-sm ${
                          (weakArea as BaeWeakAreaPayload).comparison.difference < 10
                            ? 'bg-[#f0fdf4] text-[#166534]'
                            : (weakArea as BaeWeakAreaPayload).comparison.difference < 25
                              ? 'bg-[#fef9c3] text-[#854d0e]'
                              : 'bg-[#fee2e2] text-[#991b1b]'
                        }`}
                      >
                        {(weakArea as BaeWeakAreaPayload).comparison.difference < 10 ? (
                          <p>Well balanced across both volumes.</p>
                        ) : (
                          <p>
                            Focus Area:{' '}
                            {(weakArea as BaeWeakAreaPayload).comparison.weakerVolume === 'VOL1'
                              ? BAE_VOL1_NAME
                              : BAE_VOL2_NAME}
                            . Accuracy gap is {(weakArea as BaeWeakAreaPayload).comparison.difference}%.
                          </p>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        className="border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4]"
                        onClick={() =>
                          router.push(
                            (weakArea as BaeWeakAreaPayload).comparison.weakerVolume === 'VOL1'
                              ? `/subjects/${encodeURIComponent(BAE_VOL1_CODE)}/test?mode=${SUBJECT_TEST_MODES.mock}`
                              : (weakArea as BaeWeakAreaPayload).comparison.weakerVolume === 'VOL2'
                                ? `/subjects/${encodeURIComponent(BAE_VOL2_CODE)}/test?mode=${SUBJECT_TEST_MODES.mock}`
                                : '/practice/bae-mock'
                          )
                        }
                      >
                        {(weakArea as BaeWeakAreaPayload).comparison.weakerVolume === 'VOL1'
                          ? `Practice ${BAE_VOL1_CODE} Questions`
                          : (weakArea as BaeWeakAreaPayload).comparison.weakerVolume === 'VOL2'
                            ? `Practice ${BAE_VOL2_CODE} Questions`
                            : 'Take Another BAE Mock Test'}
                        <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {(weakArea as SingleWeakAreaPayload).chapters.slice(0, 5).map((chapter) => {
                          const tone =
                            chapter.accuracy < 50
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : chapter.accuracy <= 75
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          return (
                            <div
                              key={chapter.chapterCode}
                              className={`rounded-lg border px-3 py-2 text-sm ${tone}`}
                            >
                              Chapter {getChapterLabel(chapter.chapterCode, chapterLabelByCode)}: {chapter.accuracy}% (
                              {chapter.correct}/{chapter.attempted})
                            </div>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        className="border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4]"
                        onClick={() => router.push(`/subjects/${encodeURIComponent(effectiveDefinition.subjects[0]?.code || '')}/test?mode=${SUBJECT_TEST_MODES.mock}`)}
                      >
                        Practice {effectiveDefinition.subjects[0]?.code} Questions
                        <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Complete {weakArea?.remainingForUnlock ?? 3} more {effectiveDefinition.testName} tests to unlock your
                  weak area analysis.
                </div>
              )}
            </CardContent>
          </Card>

          {weakArea?.history?.length ? (
            <Card className="rounded-3xl border border-slate-200">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">{effectiveDefinition.testName} History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Score</th>
                        {effectiveDefinition.isCombined ? <th className="py-2 pr-3">Ratio</th> : <th className="py-2 pr-3">Weakest Chapter</th>}
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weakArea.history.slice(0, 10).map((row: any) => (
                        <tr key={row.id} className="border-b border-slate-100">
                          <td className="py-2 pr-3">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="py-2 pr-3">
                            {row.scoreText} ({row.scorePercent}%)
                          </td>
                          {effectiveDefinition.isCombined ? (
                            <td className="py-2 pr-3">{row.ratioText}</td>
                          ) : (
                            <td className="py-2 pr-3">
                              {row.weakestChapter
                                ? `${row.weakestChapterLabel || getChapterLabel(String(row.weakestChapter), chapterLabelByCode)} (${row.weakestAccuracy ?? 0}%)`
                                : '--'}
                            </td>
                          )}
                          <td className="py-2 pr-3">
                            {Math.round((Number(row.timeTaken || 0) / Math.max(1, Number(row.timeAllowed || 1) * 60)) * 100)}
                            %
                          </td>
                          <td className="py-2">
                            <span
                              className={
                                Number(row.improvementDelta) > 0
                                  ? 'text-emerald-600'
                                  : Number(row.improvementDelta) < 0
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                              }
                            >
                              {Number(row.improvementDelta) > 0
                                ? `+${row.improvementDelta}`
                                : row.improvementDelta}
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
              onClick={() => router.push(`/practice/${mockKey}`)}
            >
              Take Another {effectiveDefinition.testName}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
