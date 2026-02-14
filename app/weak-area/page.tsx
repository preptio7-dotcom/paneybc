'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import { Loader2, AlertCircle, CheckCircle2, XCircle, Timer } from 'lucide-react'
import { ReportQuestionButton } from '@/components/report-question-button'

interface WeakArea {
  subject: string
  chapter: string
  attempts: number
  correct: number
  accuracy: number
}

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

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
const MIN_ACCURACY = 75

export default function WeakAreaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [authToastShown, setAuthToastShown] = useState(false)

  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<(number[] | null)[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [currentIndexQuestion, setCurrentIndexQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)
  const getQuestionId = (q: Question) => q.id ?? q._id ?? ''

  useEffect(() => {
    const loadWeakAreas = async () => {
      if (!user?.id) return
      try {
        setIsLoading(true)
        const response = await fetch(`/api/weak-areas?userId=${user.id}`)
        const data = await response.json()
        setWeakAreas(data.weakAreas || [])
      } catch (error) {
        setWeakAreas([])
      } finally {
        setIsLoading(false)
      }
    }

    if (authLoading || !user?.id) {
      setIsLoading(false)
      return
    }
    loadWeakAreas()
  }, [authLoading, user?.id])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to access Weak Area Mode.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  const currentArea = weakAreas[currentIndex]

  const fetchQuestions = async (area: WeakArea) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        subject: area.subject,
        chapters: area.chapter,
        count: '15',
        easy: '50',
        medium: '30',
        hard: '20',
        shuffle: '1',
      })
      const response = await fetch(`/api/questions/custom?${params.toString()}`)
      const data = await response.json()
      const list = (data.questions || []).sort((a: Question, b: Question) => {
        return (DIFFICULTY_ORDER[a.difficulty] ?? 3) - (DIFFICULTY_ORDER[b.difficulty] ?? 3)
      })
      setQuestions(list)
      setAnswers(new Array(list.length).fill(null))
      setIsSubmitted(false)
      setCorrectCount(0)
      setCurrentIndexQuestion(0)
      const minutes = Math.max(list.length * 2, 2)
      setTimeLeft(minutes * 60)
      startTimeRef.current = Date.now()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load questions for this chapter.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!currentArea) return
    fetchQuestions(currentArea)
  }, [currentArea?.chapter])

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

  const handleSelect = (index: number) => {
    if (isSubmitted) return
    setAnswers((prev) => {
      const next = [...prev]
      next[currentIndexQuestion] = [index]
      return next
    })
  }

  const handleMultiSelect = (index: number, maxSelections = 2) => {
    if (isSubmitted) return
    setAnswers((prev) => {
      const next = [...prev]
      const current = next[currentIndexQuestion] || []
      if (current.includes(index)) {
        next[currentIndexQuestion] = current.filter((value) => value !== index)
      } else if (current.length < maxSelections) {
        next[currentIndexQuestion] = [...current, index]
      }
      return next
    })
  }

  useEffect(() => {
    setCurrentIndexQuestion(0)
  }, [questions.length])

  const currentQuestion = questions[currentIndexQuestion]

  const optionItems = currentQuestion?.options
    ? currentQuestion.options
        .map((option, idx) => ({
          text: option?.trim() || '',
          originalIndex: idx,
        }))
        .filter((option) => option.text.length > 0)
    : []

  const progress = questions.length > 0 ? ((currentIndexQuestion + 1) / questions.length) * 100 : 0
  const currentCorrectAnswers = currentQuestion?.correctAnswers && currentQuestion.correctAnswers.length > 0
    ? currentQuestion.correctAnswers
    : typeof currentQuestion?.correctAnswer === 'number'
      ? [currentQuestion.correctAnswer]
      : []
  const allowMultiple = Boolean(currentQuestion?.allowMultiple || currentCorrectAnswers.length > 1)
  const maxSelections = currentQuestion?.maxSelections || 2
  const selected = answers[currentIndexQuestion] || []

  const handleNext = () => {
    if (currentIndexQuestion < questions.length - 1) {
      setCurrentIndexQuestion((prev) => prev + 1)
    }
  }

  const handleSubmit = () => {
    if (isSubmitted) return
    if (timerRef.current) clearInterval(timerRef.current)
    let correct = 0
    questions.forEach((q, idx) => {
      const selectedAnswers = answers[idx] || []
      const correctAnswers = q.correctAnswers && q.correctAnswers.length > 0
        ? q.correctAnswers
        : typeof q.correctAnswer === 'number'
          ? [q.correctAnswer]
          : []
      if (correctAnswers.length > 0 && [...selectedAnswers].sort().join(',') === [...correctAnswers].sort().join(',')) {
        correct += 1
      }
    })
    setCorrectCount(correct)
    setIsSubmitted(true)
  }

  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRetry = () => {
    if (!currentArea) return
    fetchQuestions(currentArea)
  }

  const handleAdvance = () => {
    if (currentIndex < weakAreas.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      router.push('/dashboard')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">Log in to access Weak Area Mode.</p>
            <Button onClick={() => router.push('/auth/login')}>Login</Button>
          </CardContent>
        </Card>
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

  if (!currentArea) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <AlertCircle className="mx-auto text-slate-400" size={44} />
            <p className="text-text-dark font-semibold">No weak areas found yet.</p>
            <p className="text-text-light text-sm">Complete at least 3 attempts in a chapter to unlock this mode.</p>
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />

      <main className="flex-1 pt-[90px] pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Weak Area Intensive Mode</p>
              <h1 className="text-2xl font-black text-slate-800">
                {currentArea.subject} - {currentArea.chapter}
              </h1>
              <p className="text-sm text-slate-500">Target accuracy: {MIN_ACCURACY}%</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-slate-500">Set {currentIndex + 1} of {weakAreas.length}</div>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Timer size={16} />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Progress</span>
                <span className="text-xs font-bold text-slate-800">{currentIndexQuestion + 1} / {questions.length}</span>
              </div>
              <Progress value={progress} className="h-3 bg-slate-100" />
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                If you think the question or answer is wrong, use the report button.
              </p>
            </CardContent>
          </Card>

          {currentQuestion && (
            <Card className="border-0 shadow-xl overflow-hidden min-h-[420px] flex flex-col">
              <CardHeader className="bg-slate-800 text-white p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase">
                    Question {currentIndexQuestion + 1}
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
              <CardContent className="p-6 space-y-3">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {optionItems.map((option, idx) => (
                  <button
                    key={option.originalIndex}
                    onClick={() => allowMultiple ? handleMultiSelect(option.originalIndex, maxSelections) : handleSelect(option.originalIndex)}
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
                      {String.fromCharCode(65 + idx)}
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

                <div className="flex items-center justify-between pt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentIndexQuestion((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndexQuestion === 0}
                    className="gap-2 text-slate-500"
                  >
                    Back
                  </Button>

                  {currentIndexQuestion < questions.length - 1 ? (
                    <Button onClick={handleNext} className="bg-slate-800 hover:bg-slate-900 px-8">
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} className="bg-[#0F7938] hover:bg-[#0F7938]/90 text-white px-10 font-bold">
                      Submit Set
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isSubmitted && (
            <Card className="border border-border">
              <CardContent className="p-6 space-y-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  {accuracy >= MIN_ACCURACY ? (
                    <CheckCircle2 className="text-emerald-500" size={24} />
                  ) : (
                    <XCircle className="text-rose-500" size={24} />
                  )}
                  <h3 className="text-xl font-bold text-slate-800">Accuracy: {accuracy}%</h3>
                </div>
                <p className="text-sm text-slate-500">
                  {accuracy >= MIN_ACCURACY
                    ? 'Great job! You can move to the next weak area.'
                    : `You need ${MIN_ACCURACY}% to advance. Retry this chapter.`}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {accuracy >= MIN_ACCURACY ? (
                    <Button onClick={handleAdvance} className="bg-[#0F7938] hover:bg-[#0F7938]/90">
                      {currentIndex < weakAreas.length - 1 ? 'Next Chapter' : 'Finish'}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleRetry}>
                      Retry Chapter
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                    Exit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
