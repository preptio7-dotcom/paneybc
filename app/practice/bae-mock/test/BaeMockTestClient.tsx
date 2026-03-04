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

type BaeQuestion = {
  index: number
  id: string
  subject: string
  questionNumber: number
  question: string
  imageUrl?: string | null
  options: string[]
  explanation: string
  difficulty: string
  allowMultiple: boolean
  maxSelections: number
  volume: 'VOL1' | 'VOL2'
  volumeLabel: string
}

type SessionData = {
  id: string
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

export default function BaeMockTestClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const { toast } = useToast()

  const sessionId = useMemo(() => String(searchParams.get('sessionId') || '').trim(), [searchParams])

  const [session, setSession] = useState<SessionData | null>(null)
  const [questions, setQuestions] = useState<BaeQuestion[]>([])
  const [answers, setAnswers] = useState<number[][]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTimestamp, setStartTimestamp] = useState<number>(() => Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSubmit = async (autoSubmitted = false) => {
    if (!session || isSubmitting) return
    setIsSubmitting(true)

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    try {
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000)
      const response = await fetch(`/api/bae-mock/session/${encodeURIComponent(session.id)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          timeTakenSeconds: elapsedSeconds,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit BAE mock test')
      }

      if (autoSubmitted) {
        toast({
          title: "Time's up!",
          description: 'Your BAE mock test has been auto-submitted.',
        })
      } else {
        toast({
          title: 'Test submitted',
          description: 'Your BAE mock results are ready.',
        })
      }

      router.replace(`/practice/bae-mock/results/${encodeURIComponent(session.id)}`)
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
    if (!sessionId) return
    if (loading || !user) {
      setIsLoading(false)
      return
    }

    const loadSession = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/bae-mock/session/${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load BAE mock session')
        }

        const loadedSession: SessionData = data.session
        const loadedQuestions: BaeQuestion[] = Array.isArray(data.questions) ? data.questions : []
        const loadedAnswers: number[][] = Array.isArray(data.answers)
          ? data.answers.map((entry: any) =>
              Array.isArray(entry)
                ? entry.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v >= 0)
                : []
            )
          : []

        if (loadedSession.completed) {
          router.replace(`/practice/bae-mock/results/${encodeURIComponent(sessionId)}`)
          return
        }

        setSession(loadedSession)
        setQuestions(loadedQuestions)
        setAnswers(
          loadedQuestions.map((_, index) => (Array.isArray(loadedAnswers[index]) ? loadedAnswers[index] : []))
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
  }, [loading, router, sessionId, toast, user])

  useEffect(() => {
    if (isLoading || isSubmitting || !session || questions.length === 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          void handleSubmit(true)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isLoading, isSubmitting, session, questions.length])

  const handleOptionClick = (optionIndex: number) => {
    const question = questions[currentIndex]
    if (!question || isSubmitting) return

    setAnswers((previous) => {
      const next = previous.map((entry) => entry.slice())
      const selected = next[currentIndex] || []

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

  const currentQuestion = questions[currentIndex]
  const progressPercent = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0

  const answeredVol1 = useMemo(
    () => questions.filter((question, index) => question.volume === 'VOL1' && (answers[index] || []).length > 0).length,
    [answers, questions]
  )
  const answeredVol2 = useMemo(
    () => questions.filter((question, index) => question.volume === 'VOL2' && (answers[index] || []).length > 0).length,
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
              <p className="text-slate-600">Please log in to continue with the BAE mock test.</p>
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
              <p className="text-slate-600">This BAE mock session could not be loaded.</p>
              <Button onClick={() => router.push('/practice/bae-mock')}>Start New Mock Test</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />
      <main className="flex-1 pt-[80px] pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1 shadow-sm border-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${timeLeft <= 300 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-600'}`}>
                    <Timer size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Time Remaining</p>
                    <p className={`text-xl font-black font-mono ${timeLeft <= 300 ? 'text-rose-600' : 'text-slate-900'}`}>
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
                  Vol I: {answeredVol1} answered · Vol II: {answeredVol2} answered
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
                          (answers[index] || []).length > 0
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
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        currentQuestion.volume === 'VOL1'
                          ? 'bg-[#dcfce7] text-[#166534]'
                          : 'bg-[#dbeafe] text-[#1d4ed8]'
                      }`}
                    >
                      {currentQuestion.volumeLabel}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-medium leading-snug">{currentQuestion.question}</CardTitle>
                </CardHeader>

                <CardContent className="p-6 flex-1 flex flex-col gap-3">
                  {currentQuestion.imageUrl ? (
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question visual"
                      className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-white"
                      loading="lazy"
                    />
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
                    {currentQuestion.options.map((option, optionIndex) => {
                      const selected = answers[currentIndex] || []
                      const isSelected = selected.includes(optionIndex)
                      return (
                        <button
                          key={`${currentQuestion.id}-${optionIndex}`}
                          onClick={() => handleOptionClick(optionIndex)}
                          className={`group flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                            isSelected
                              ? 'border-primary-green bg-primary-green/5'
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${
                              isSelected ? 'bg-primary-green text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{option}</span>
                        </button>
                      )
                    })}
                  </div>

                  {currentQuestion.allowMultiple ? (
                    <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      Select up to {Math.max(1, currentQuestion.maxSelections || 2)} options for this question.
                    </p>
                  ) : null}

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
                        onClick={() => setCurrentIndex((previous) => Math.min(questions.length - 1, previous + 1))}
                        disabled={isSubmitting}
                      >
                        Save &amp; Next
                        <ChevronRight size={16} className="ml-1" />
                      </Button>
                    ) : (
                      <Button
                        className="bg-[linear-gradient(135deg,#16a34a,#2563eb)] hover:brightness-110"
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
