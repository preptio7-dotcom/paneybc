'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Loader2, Send, Timer } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import { PdfViewer } from '@/components/financial-statements/PdfViewer'
import { SociTable } from '@/components/financial-statements/SociTable'
import { SofpTable } from '@/components/financial-statements/SofpTable'
import {
  BAE_VOL1_CODES,
  BAE_VOL1_NAME,
  BAE_VOL2_CODE,
  BAE_VOL2_NAME,
  isVol1SubjectCode,
} from '@/lib/bae-mock'
import { MOCK_TEST_DEFINITIONS, type MockSubjectDefinition, type MockTestRouteKey } from '@/lib/mock-tests'
import { buildQuestionOptionItems, optionLetter } from '@/lib/question-options'

type ApiDefinition = {
  routeKey: string
  testType: string
  testName: string
  isCombined: boolean
  subjects: MockSubjectDefinition[]
  gradientFrom: string
  gradientTo: string
}

type MockQuestion = {
  index: number
  id: string
  questionType?: 'mcq' | 'financial_statement'
  subject: string
  chapter: string | null
  questionNumber: number
  question: string
  imageUrl?: string | null
  options: string[]
  optionImageUrls?: string[]
  explanation: string
  difficulty: string
  allowMultiple: boolean
  maxSelections: number
  volume: 'VOL1' | 'VOL2' | null
  volumeLabel: string
  financialStatementCase?: {
    id: number
    caseNumber: string
    title: string
    trialBalancePdfUrl: string
    additionalInfo?: string
    showThousandsNote?: boolean
    totalMarks?: number
    sociLineItems: Array<{
      id: number
      heading: string
      inputType?: 'dropdown' | 'manual'
      dropdownOptions: string[]
      marks: number
    }>
    sofpLineItems: Array<{
      id: number
      heading: string
      inputType?: 'dropdown' | 'manual'
      groupLabel?: string
      dropdownOptions: string[]
      marks: number
    }>
  } | null
}

type FinancialStatementLineAnswer = {
  line_item_id: number
  selected_value: string
}

type FinancialStatementAnswerPayload = {
  sociAnswers: FinancialStatementLineAnswer[]
  sofpAnswers: FinancialStatementLineAnswer[]
}

type MockAnswerEntry = number[] | FinancialStatementAnswerPayload

type SessionData = {
  id: string
  testType: string
  completed: boolean
  status: string
  totalQuestions: number
  timeAllowed: number
  timeTaken: number | null
  vol1Count: number
  vol2Count: number
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function normalizeAnswerEntry(entry: unknown) {
  if (!Array.isArray(entry)) return []
  return entry
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0)
}

function normalizeFinancialStatementLineAnswers(value: unknown): FinancialStatementLineAnswer[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const item = row as Record<string, unknown>
      const lineItemId = Number(item.line_item_id)
      if (!Number.isInteger(lineItemId) || lineItemId <= 0) return null
      return {
        line_item_id: lineItemId,
        selected_value: String(item.selected_value ?? '').trim(),
      }
    })
    .filter(Boolean) as FinancialStatementLineAnswer[]
}

function normalizeFinancialStatementAnswerPayload(entry: unknown): FinancialStatementAnswerPayload {
  const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
  return {
    sociAnswers: normalizeFinancialStatementLineAnswers(row.sociAnswers),
    sofpAnswers: normalizeFinancialStatementLineAnswers(row.sofpAnswers),
  }
}

function isFinancialStatementAnswerPayload(value: MockAnswerEntry | undefined): value is FinancialStatementAnswerPayload {
  return Boolean(
    value &&
      !Array.isArray(value) &&
      typeof value === 'object' &&
      'sociAnswers' in value &&
      'sofpAnswers' in value
  )
}

function isAnswerEntryAttempted(entry: MockAnswerEntry | undefined) {
  if (!entry) return false
  if (Array.isArray(entry)) return entry.length > 0
  return [...entry.sociAnswers, ...entry.sofpAnswers].some((row) => String(row.selected_value || '').trim())
}

function resolveSubjectTheme(
  subjectCode: string,
  definition: ApiDefinition | null,
  fallback: MockSubjectDefinition
) {
  const normalized = String(subjectCode || '').toUpperCase()
  const subject =
    definition?.subjects.find((item) => item.code.toUpperCase() === normalized) || null
  if (subject) return subject

  if (definition?.isCombined) {
    if (isVol1SubjectCode(normalized)) {
      return (
        definition.subjects.find((item) => BAE_VOL1_CODES.includes(item.code as any)) ||
        definition.subjects[0] ||
        fallback
      )
    }

    if (normalized === BAE_VOL2_CODE) {
      return (
        definition.subjects.find((item) => item.code.toUpperCase() === BAE_VOL2_CODE) ||
        definition.subjects[1] ||
        definition.subjects[0] ||
        fallback
      )
    }
  }

  return fallback
}

export function MockTestTestClient({ mockKey }: { mockKey: MockTestRouteKey }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const { toast } = useToast()

  const defaultDefinition = MOCK_TEST_DEFINITIONS[mockKey]
  const sessionId = useMemo(() => String(searchParams.get('sessionId') || '').trim(), [searchParams])

  const [definition, setDefinition] = useState<ApiDefinition | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [questions, setQuestions] = useState<MockQuestion[]>([])
  const [answers, setAnswers] = useState<MockAnswerEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTimestamp, setStartTimestamp] = useState<number>(() => Date.now())

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const effectiveDefinition = definition || {
    routeKey: defaultDefinition.routeKey,
    testType: defaultDefinition.testType,
    testName: defaultDefinition.testName,
    isCombined: defaultDefinition.isCombined,
    subjects: defaultDefinition.subjects,
    gradientFrom: defaultDefinition.gradientFrom,
    gradientTo: defaultDefinition.gradientTo,
  }

  const handleSubmit = async (autoSubmitted = false) => {
    if (!session || isSubmitting) return
    setIsSubmitting(true)

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000)
      const response = await fetch(`/api/mock-tests/session/${encodeURIComponent(session.id)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          timeTakenSeconds: elapsedSeconds,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || `Failed to submit ${effectiveDefinition.testName}`)
      }

      if (autoSubmitted) {
        toast({
          title: "Time's up!",
          description: `${effectiveDefinition.testName} has been auto-submitted.`,
        })
      } else {
        toast({
          title: 'Test submitted',
          description: `${effectiveDefinition.testName} results are ready.`,
        })
      }

      router.replace(`/practice/${effectiveDefinition.routeKey}/results/${encodeURIComponent(session.id)}`)
    } catch (error: any) {
      toast({
        title: 'Submission failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false)
      return
    }
    if (loading || !user) {
      setIsLoading(false)
      return
    }

    const loadSession = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/mock-tests/session/${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load mock test session')
        }

        const loadedDefinition: ApiDefinition | null =
          data.definition && typeof data.definition === 'object'
            ? (data.definition as ApiDefinition)
            : null

        if (loadedDefinition?.routeKey && loadedDefinition.routeKey !== mockKey) {
          router.replace(
            `/practice/${loadedDefinition.routeKey}/test?sessionId=${encodeURIComponent(sessionId)}`
          )
          return
        }

        const loadedSession: SessionData = data.session
        const loadedQuestions: MockQuestion[] = Array.isArray(data.questions) ? data.questions : []
        const loadedAnswers: MockAnswerEntry[] = Array.isArray(data.answers)
          ? data.answers.map((entry: unknown, index: number) => {
              const question = loadedQuestions[index]
              if (question?.questionType === 'financial_statement') {
                return normalizeFinancialStatementAnswerPayload(entry)
              }
              return normalizeAnswerEntry(entry)
            })
          : []

        if (loadedSession.completed) {
          router.replace(`/practice/${mockKey}/results/${encodeURIComponent(sessionId)}`)
          return
        }

        setDefinition(loadedDefinition)
        setSession(loadedSession)
        setQuestions(loadedQuestions)
        setAnswers(
          loadedQuestions.map((question, index) => {
            const saved = loadedAnswers[index]
            if (question.questionType === 'financial_statement') {
              return isFinancialStatementAnswerPayload(saved)
                ? saved
                : { sociAnswers: [], sofpAnswers: [] }
            }
            return Array.isArray(saved) ? saved : []
          })
        )
        setTimeLeft(Math.max(0, loadedSession.timeAllowed * 60))
        setStartTimestamp(Date.now())
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Could not load test session.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadSession()
  }, [loading, mockKey, router, sessionId, toast, user])

  useEffect(() => {
    if (isLoading || isSubmitting || !session || questions.length === 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          void handleSubmit(true)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isLoading, isSubmitting, questions.length, session])

  const handleOptionClick = (optionIndex: number) => {
    const question = questions[currentIndex]
    if (!question || isSubmitting || question.questionType === 'financial_statement') return

    setAnswers((previous) => {
      const next = previous.map((entry) =>
        Array.isArray(entry)
          ? entry.slice()
          : {
              sociAnswers: entry.sociAnswers.map((row) => ({ ...row })),
              sofpAnswers: entry.sofpAnswers.map((row) => ({ ...row })),
            }
      )
      const selected = Array.isArray(next[currentIndex]) ? (next[currentIndex] as number[]) : []

      if (question.allowMultiple) {
        if (selected.includes(optionIndex)) {
          next[currentIndex] = selected.filter((entry) => entry !== optionIndex)
        } else if (selected.length < Math.max(1, question.maxSelections || 2)) {
          next[currentIndex] = [...selected, optionIndex]
        }
      } else {
        next[currentIndex] = [optionIndex]
      }

      return next
    })
  }

  const updateFinancialStatementAnswers = (
    key: keyof FinancialStatementAnswerPayload,
    nextRows: FinancialStatementLineAnswer[]
  ) => {
    setAnswers((previous) => {
      const next = previous.map((entry) =>
        Array.isArray(entry)
          ? entry.slice()
          : {
              sociAnswers: entry.sociAnswers.map((row) => ({ ...row })),
              sofpAnswers: entry.sofpAnswers.map((row) => ({ ...row })),
            }
      )
      const existing = isFinancialStatementAnswerPayload(next[currentIndex])
        ? (next[currentIndex] as FinancialStatementAnswerPayload)
        : { sociAnswers: [], sofpAnswers: [] }
      next[currentIndex] = {
        ...existing,
        [key]: nextRows,
      }
      return next
    })
  }

  const currentQuestion = questions[currentIndex]
  const isFinancialStatementQuestion = currentQuestion?.questionType === 'financial_statement'
  const financialStatementCase = isFinancialStatementQuestion
    ? currentQuestion?.financialStatementCase || null
    : null
  const currentMcqSelection = Array.isArray(answers[currentIndex])
    ? (answers[currentIndex] as number[])
    : []
  const currentFinancialStatementAnswer = isFinancialStatementQuestion &&
    isFinancialStatementAnswerPayload(answers[currentIndex])
      ? (answers[currentIndex] as FinancialStatementAnswerPayload)
      : { sociAnswers: [], sofpAnswers: [] }
  const optionItems = currentQuestion
    ? isFinancialStatementQuestion
      ? []
      : buildQuestionOptionItems(currentQuestion.options, currentQuestion.optionImageUrls)
    : []
  const progressPercent = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0

  const answeredCount = useMemo(
    () => answers.filter((entry) => isAnswerEntryAttempted(entry)).length,
    [answers]
  )
  const answeredVol1 = useMemo(
    () =>
      questions.filter(
        (question, index) =>
          question.volume === 'VOL1' && isAnswerEntryAttempted(answers[index])
      ).length,
    [answers, questions]
  )
  const answeredVol2 = useMemo(
    () =>
      questions.filter(
        (question, index) =>
          question.volume === 'VOL2' && isAnswerEntryAttempted(answers[index])
      ).length,
    [answers, questions]
  )

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
              <p className="text-slate-600">Please log in to continue with this mock test.</p>
              <Button onClick={() => router.push('/auth/login')}>Log In</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!sessionId || !session || questions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="pt-24 px-4">
          <Card className="mx-auto max-w-lg rounded-2xl border border-slate-200">
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="mx-auto text-slate-400" size={36} />
              <h1 className="text-2xl font-bold text-slate-900">Session not available</h1>
              <p className="text-slate-600">This mock session could not be loaded.</p>
              <Button onClick={() => router.push(`/practice/${mockKey}`)}>Start New Mock Test</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const fallbackSubjectTheme = effectiveDefinition.subjects[0] || defaultDefinition.subjects[0]
  const questionTheme =
    currentQuestion.volume === 'VOL1' && effectiveDefinition.isCombined
      ? effectiveDefinition.subjects[0] || fallbackSubjectTheme
      : currentQuestion.volume === 'VOL2' && effectiveDefinition.isCombined
        ? effectiveDefinition.subjects[1] || effectiveDefinition.subjects[0] || fallbackSubjectTheme
        : resolveSubjectTheme(currentQuestion.subject, effectiveDefinition, fallbackSubjectTheme)

  const volumeLabel =
    currentQuestion.volume === 'VOL1'
      ? BAE_VOL1_NAME
      : currentQuestion.volume === 'VOL2'
        ? BAE_VOL2_NAME
        : currentQuestion.volumeLabel || currentQuestion.subject

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />
      <main className="flex-1 pt-[80px] pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1 shadow-sm border-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      timeLeft <= 300 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Timer size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Time Remaining
                    </p>
                    <p
                      className={`text-xl font-black font-mono ${
                        timeLeft <= 300 ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {formatTimer(timeLeft)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 shadow-sm border-0">
              <CardContent className="p-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Progress</span>
                  <span>
                    {currentIndex + 1} / {questions.length}
                  </span>
                </div>
                <Progress value={progressPercent} className="mt-2 h-3 bg-slate-100" />
                <p className="mt-2 text-[11px] text-slate-400">
                  {effectiveDefinition.isCombined
                    ? `Vol I: ${answeredVol1} answered · Vol II: ${answeredVol2} answered`
                    : `${answeredCount} answered`}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="hidden lg:block space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">Question Navigation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-8 w-8 rounded-md text-[10px] font-bold transition-all ${
                          currentIndex === index ? 'ring-2 ring-primary-green ring-offset-2' : ''
                        } ${
                          isAnswerEntryAttempted(answers[index])
                            ? 'bg-primary-green text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full h-12 bg-slate-800 hover:bg-slate-900 gap-2"
                onClick={() => void handleSubmit(false)}
                disabled={isSubmitting}
              >
                <Send size={18} />
                {isSubmitting ? 'Submitting...' : 'Finish Test'}
              </Button>
            </div>

            <div className="lg:col-span-3">
              <Card className="border-0 shadow-xl overflow-hidden min-h-[430px] flex flex-col">
                <CardHeader className="bg-slate-800 text-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: questionTheme.lightBg,
                        color: questionTheme.accentColor,
                      }}
                    >
                      {volumeLabel}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-medium leading-snug">
                    {currentQuestion.question}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 flex-1 flex flex-col gap-3">
                  {isFinancialStatementQuestion ? (
                    financialStatementCase ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <span className="font-semibold">{financialStatementCase.caseNumber}:</span>{' '}
                          {financialStatementCase.title}
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-800">Trial Balance</h3>
                            <PdfViewer url={financialStatementCase.trialBalancePdfUrl} />
                            {financialStatementCase.additionalInfo ? (
                              <Card className="border border-slate-200 bg-white">
                                <CardContent className="p-3 text-sm text-slate-600">
                                  <p className="font-semibold text-slate-800 mb-1">Additional Information</p>
                                  {financialStatementCase.additionalInfo}
                                </CardContent>
                              </Card>
                            ) : null}
                          </div>
                          <div className="space-y-4">
                            {financialStatementCase.showThousandsNote ? (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <span className="font-semibold">Rs. 000:</span> Enter values in thousands.
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-slate-800">
                                Statement of Comprehensive Income (SOCI)
                              </h3>
                              <SociTable
                                lineItems={financialStatementCase.sociLineItems}
                                answers={currentFinancialStatementAnswer.sociAnswers}
                                onAnswerChange={(rows) =>
                                  updateFinancialStatementAnswers('sociAnswers', rows)
                                }
                                caseId={financialStatementCase.id}
                              />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-slate-800">
                                Statement of Financial Position (SOFP)
                              </h3>
                              <SofpTable
                                lineItems={financialStatementCase.sofpLineItems}
                                answers={currentFinancialStatementAnswer.sofpAnswers}
                                onAnswerChange={(rows) =>
                                  updateFinancialStatementAnswers('sofpAnswers', rows)
                                }
                                caseId={financialStatementCase.id}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        This Financial Statements case could not be loaded.
                      </div>
                    )
                  ) : (
                    <>
                      {currentQuestion.imageUrl ? (
                        <img
                          src={currentQuestion.imageUrl}
                          alt="Question visual"
                          className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-white"
                          loading="lazy"
                        />
                      ) : null}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
                        {optionItems.map((option) => {
                          const optionIndex = option.originalIndex
                          const selected = currentMcqSelection
                          const isSelected = selected.includes(optionIndex)
                          return (
                            <button
                              key={`${currentQuestion.id}-${optionIndex}`}
                              onClick={() => handleOptionClick(optionIndex)}
                              className={`group flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                isSelected
                                  ? 'border-primary-green bg-primary-green/5'
                                  : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div
                                className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${
                                  isSelected
                                    ? 'bg-primary-green text-white'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {optionLetter(optionIndex)}
                              </div>
                              <div className="flex-1 space-y-2">
                                <span className="block text-sm font-medium text-slate-700">
                                  {option.text || `Option ${optionLetter(optionIndex)}`}
                                </span>
                                {option.imageUrl ? (
                                  <img
                                    src={option.imageUrl}
                                    alt={`Option ${optionLetter(optionIndex)} visual`}
                                    className="max-h-40 w-full rounded-md border border-border bg-white object-contain"
                                    loading="lazy"
                                  />
                                ) : null}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {currentQuestion.allowMultiple ? (
                        <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          Select up to {Math.max(1, currentQuestion.maxSelections || 2)} options for
                          this question.
                        </p>
                      ) : null}
                    </>
                  )}

                  <div className="mt-6 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      className="gap-1.5 text-slate-500"
                      onClick={() => setCurrentIndex((previous) => Math.max(0, previous - 1))}
                      disabled={currentIndex === 0 || isSubmitting}
                    >
                      <ChevronLeft size={18} />
                      Back
                    </Button>

                    {currentIndex < questions.length - 1 ? (
                      <Button
                        className="bg-slate-800 hover:bg-slate-900"
                        onClick={() =>
                          setCurrentIndex((previous) => Math.min(questions.length - 1, previous + 1))
                        }
                        disabled={isSubmitting}
                      >
                        Save &amp; Next
                        <ChevronRight size={16} className="ml-1" />
                      </Button>
                    ) : (
                      <Button
                        className="text-white hover:brightness-110"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${effectiveDefinition.gradientFrom}, ${effectiveDefinition.gradientTo})`,
                        }}
                        onClick={() => void handleSubmit(false)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Mock Test'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 lg:hidden">
                <Button
                  className="w-full h-12 bg-slate-800 hover:bg-slate-900 gap-2"
                  onClick={() => void handleSubmit(false)}
                  disabled={isSubmitting}
                >
                  <Clock size={18} />
                  {isSubmitting ? 'Submitting...' : 'Finish & Submit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
