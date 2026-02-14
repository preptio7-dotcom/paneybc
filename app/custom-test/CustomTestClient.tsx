'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  AlertCircle,
  Clock,
  Send,
  Trophy,
  XCircle,
} from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { ReportQuestionButton } from '@/components/report-question-button'

interface Question {
  id?: string
  _id?: string
  subject: string
  chapter?: string
  questionNumber: number
  question: string
  imageUrl?: string
  options: string[]
  correctAnswer?: number
  correctAnswers?: number[]
  allowMultiple?: boolean
  maxSelections?: number
  explanation: string
  difficulty: string
}

interface UserAnswer {
  questionId: string
  selectedAnswer: number | number[]
  isCorrect: boolean
  timeSpent: number
}

export default function CustomTestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [authToastShown, setAuthToastShown] = useState(false)

  const subject = searchParams.get('subject') || ''
  const chapters = searchParams.get('chapters') || ''
  const count = searchParams.get('count') || '25'
  const timeParam = searchParams.get('time') || '20'
  const easy = searchParams.get('easy') || '30'
  const medium = searchParams.get('medium') || '50'
  const hard = searchParams.get('hard') || '20'

  const timeMinutes = Math.max(parseInt(timeParam, 10) || 20, 5)
  const initialTime = timeMinutes * 60

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<(number[] | null)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [timeLeft, setTimeLeft] = useState(initialTime)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const [testResult, setTestResult] = useState<any>(null)
  const getQuestionId = (q: Question) => q.id ?? q._id ?? ''

  useEffect(() => {
    if (authLoading || !user || !subject) {
      setIsLoading(false)
      return
    }
    const fetchQuestions = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams({
          subject,
          count,
          time: timeParam,
          easy,
          medium,
          hard,
          shuffle: '1',
        })
        if (chapters) {
          params.set('chapters', chapters)
        }

        const response = await fetch(`/api/questions/custom?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch questions')
        const data = await response.json()
        setQuestions(data.questions || [])
        setUserAnswers(new Array(data.questions.length).fill(null))
        setCurrentIndex(0)
        setTimeLeft(initialTime)
        startTimeRef.current = Date.now()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load custom quiz questions.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [authLoading, user, subject, chapters, count, timeParam, easy, medium, hard, initialTime, toast])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to start a custom quiz.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  useEffect(() => {
    if (isLoading || isSubmitted || questions.length === 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isLoading, isSubmitted, questions.length])

  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted) return
    setUserAnswers((prev) => {
      const next = [...prev]
      next[currentIndex] = [optionIndex]
      return next
    })
  }

  const handleMultiSelect = (optionIndex: number, maxSelections = 2) => {
    if (isSubmitted) return
    setUserAnswers((prev) => {
      const next = [...prev]
      const current = next[currentIndex] || []
      if (current.includes(optionIndex)) {
        next[currentIndex] = current.filter((value) => value !== optionIndex)
      } else if (current.length < maxSelections) {
        next[currentIndex] = [...current, optionIndex]
      }
      return next
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (isSubmitted) return
    if (timerRef.current) clearInterval(timerRef.current)
    setIsSubmitted(true)
    setIsLoading(true)

    const finalAnswers: UserAnswer[] = questions.map((q, idx) => {
      const selected = userAnswers[idx] || []
      const correctAnswers = q.correctAnswers && q.correctAnswers.length > 0
        ? q.correctAnswers
        : typeof q.correctAnswer === 'number'
          ? [q.correctAnswer]
          : []
      const allowMultiple = Boolean(q.allowMultiple || correctAnswers.length > 1)
      const isCorrect = correctAnswers.length > 0
        ? [...selected].sort().join(',') === [...correctAnswers].sort().join(',')
        : false

      return {
        questionId: getQuestionId(q),
        subject: q.subject,
        questionNumber: q.questionNumber,
        selectedAnswer: selected.length > 0 ? (allowMultiple ? selected : selected[0]) : -1,
        isCorrect,
        timeSpent: 0,
      }
    })

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          subject,
          answers: finalAnswers,
          duration,
        }),
      })

      if (!response.ok) throw new Error('Failed to save results')
      const data = await response.json()
      setTestResult(data.result)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your test data.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin text-primary-green">
          <Clock size={40} />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="mb-2">Login required</CardTitle>
          <p className="text-slate-600 mb-6">Please log in to build and take custom quizzes.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
            <Button variant="outline" onClick={() => router.push('/custom-quiz')}>Back to Builder</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="mb-2">Missing Subject</CardTitle>
          <p className="text-slate-600 mb-6">Select a subject to build a quiz.</p>
          <Button onClick={() => router.push('/custom-quiz')}>Back to Builder</Button>
        </Card>
      </div>
    )
  }

  if (isLoading && !isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin text-primary-green">
          <Clock size={40} />
        </div>
      </div>
    )
  }

  if (questions.length === 0 && !isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <AlertCircle className="mx-auto text-slate-400 mb-4" size={48} />
          <CardTitle className="mb-2">No Questions Found</CardTitle>
          <p className="text-slate-600 mb-6">We couldn't find any questions for your custom quiz.</p>
          <Button onClick={() => router.push('/custom-quiz')}>Back to Builder</Button>
        </Card>
      </div>
    )
  }

  if (isSubmitted && testResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navigation />
        <main className="flex-1 pt-[100px] pb-12 px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            <div
              className={`
              p-8 rounded-3xl text-center space-y-4 shadow-xl border-4
              ${testResult.passed ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-500'}
            `}
            >
              <div
                className={`
                mx-auto w-20 h-20 rounded-full flex items-center justify-center
                ${testResult.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}
              `}
              >
                {testResult.passed ? <Trophy size={40} /> : <XCircle size={40} />}
              </div>
              <h1 className="text-4xl font-black text-slate-800">
                {testResult.passed ? 'QUIZ PASSED!' : 'QUIZ FAILED'}
              </h1>
              <p className="text-slate-600 font-medium">
                Subject: <span className="font-bold text-slate-800">{subject}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">Accuracy</p>
                  <p className="text-3xl font-black text-slate-800">{testResult.weightedPercent ?? testResult.score}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">Correct</p>
                  <p className="text-3xl font-black text-emerald-500">{testResult.correctAnswers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">Time Taken</p>
                  <p className="text-3xl font-black text-slate-800">
                    {Math.floor(testResult.duration / 60)}m {testResult.duration % 60}s
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => router.push('/dashboard')} className="flex-1 h-12 text-lg bg-slate-800">
                Back to Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push('/custom-quiz')} className="flex-1 h-12 text-lg">
                Build Another Quiz
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const optionItems = currentQuestion.options
    .map((option, index) => ({
      text: option?.trim() || '',
      originalIndex: index,
    }))
    .filter((option) => option.text.length > 0)

  const progress = ((currentIndex + 1) / questions.length) * 100
  const currentCorrectAnswers = currentQuestion.correctAnswers && currentQuestion.correctAnswers.length > 0
    ? currentQuestion.correctAnswers
    : typeof currentQuestion.correctAnswer === 'number'
      ? [currentQuestion.correctAnswer]
      : []
  const allowMultiple = Boolean(currentQuestion.allowMultiple || currentCorrectAnswers.length > 1)
  const maxSelections = currentQuestion.maxSelections || 2
  const selected = userAnswers[currentIndex] || []

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />

      <main className="flex-1 pt-[80px] pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => router.push('/custom-quiz')}>
              Back to Builder
            </Button>
            <span className="text-xs text-slate-500">Custom Quiz</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1 shadow-sm border-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${timeLeft < 60 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                    <Timer size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Time Remaining</p>
                    <p className={`text-xl font-black font-mono ${timeLeft < 60 ? 'text-rose-500' : 'text-slate-800'}`}>
                      {formatTime(timeLeft)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 shadow-sm border-0">
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Progress</span>
                  <span className="text-xs font-bold text-slate-800">{currentIndex + 1} / {questions.length}</span>
                </div>
                <Progress value={progress} className="h-3 bg-slate-100" />
                <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  If you think the question or answer is wrong, use the report button.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="hidden lg:block space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">Navigation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`
                          w-8 h-8 rounded-md text-[10px] font-bold transition-all
                          ${currentIndex === idx ? 'ring-2 ring-primary-green ring-offset-2' : ''}
                          ${userAnswers[idx] !== null ? 'bg-primary-green text-white' : 'bg-slate-100 text-slate-500'}
                        `}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSubmit} className="w-full bg-slate-800 hover:bg-slate-900 gap-2 h-12">
                <Send size={18} />
                Finish Quiz
              </Button>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <Card className="border-0 shadow-xl overflow-hidden min-h-[420px] flex flex-col">
                <CardHeader className="bg-slate-800 text-white p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase">
                      Question {currentIndex + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs font-mono italic">
                        Difficulty: {currentQuestion.difficulty}
                      </span>
                      <ReportQuestionButton
                        questionId={getQuestionId(currentQuestion)}
                        subject={currentQuestion.subject}
                        questionNumber={currentQuestion.questionNumber}
                      />
                    </div>
                  </div>
                  <CardTitle className="text-lg md:text-xl font-medium leading-snug">
                    {currentQuestion.question}
                  </CardTitle>
                </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col gap-3">
                    {currentQuestion.imageUrl ? (
                      <div className="w-full">
                        <img
                          src={currentQuestion.imageUrl}
                          alt="Question diagram"
                          className="w-full max-h-64 object-contain rounded-lg border border-border bg-white"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
                    {optionItems.map((option, index) => (
                      <button
                        key={option.originalIndex}
                        onClick={() => allowMultiple ? handleMultiSelect(option.originalIndex, maxSelections) : handleOptionSelect(option.originalIndex)}
                        className={`
                          group flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
                          ${selected.includes(option.originalIndex)
                            ? 'border-primary-green bg-primary-green/5 shadow-inner'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors
                          ${selected.includes(option.originalIndex) ? 'bg-primary-green text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}
                        `}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className={`flex-1 text-base font-medium ${selected.includes(option.originalIndex) ? 'text-slate-800' : 'text-slate-600'}`}>
                          {option.text}
                        </span>
                      </button>
                    ))}
                  {allowMultiple && (
                    <p className="text-xs font-semibold text-amber-900 bg-amber-100/80 border border-amber-300 rounded-md px-3 py-2">
                      Select up to {maxSelections} options.
                    </p>
                  )}
                  </div>

                  <div className="flex items-center justify-between pt-8 mt-auto">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="gap-2 text-slate-500"
                    >
                      <ChevronLeft size={20} />
                      Back
                    </Button>

                    {currentIndex < questions.length - 1 ? (
                      <Button
                        onClick={() => setCurrentIndex((prev) => prev + 1)}
                        className="bg-slate-800 hover:bg-slate-900 px-8"
                      >
                        Save & Next
                        <ChevronRight size={20} className="ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        className="bg-[#0F7938] hover:bg-[#0F7938]/90 text-white px-10 font-bold shadow-md transition-all"
                      >
                        Submit Quiz
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:hidden">
                <Button onClick={handleSubmit} className="w-full bg-slate-800 hover:bg-slate-900 gap-2 h-14 text-lg font-bold shadow-lg">
                  <Send size={20} />
                  Finish & Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
