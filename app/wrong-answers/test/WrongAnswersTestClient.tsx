'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, Clock, Timer, Trophy, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { ReportQuestionButton } from '@/components/report-question-button'
import { AnswerBreakdown } from '@/components/answer-breakdown'

interface Question {
  id: string
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

interface ReviewAnswer {
  questionNumber: number
  questionText: string
  yourAnswer: string
  correctAnswer: string
  isCorrect: boolean
  timeSpent: string
  explanation: string
}

export default function WrongAnswersTestClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const subject = useMemo(() => (searchParams.get('subject') || '').toUpperCase(), [searchParams])
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<(number[] | null)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [resultSummary, setResultSummary] = useState<{ total: number; correct: number; score: number; duration: number } | null>(null)

  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  const indexToOptionText = (options: string[] | undefined, index: number) => {
    if (!options || index < 0 || index >= options.length) return '-'
    const label = String.fromCharCode(65 + index)
    const text = options[index]?.trim() || ''
    return text ? `${label}. ${text}` : label
  }

  const toOptionList = (options: string[] | undefined, value: number[] | null) => {
    if (!value || value.length === 0) return '-'
    return value.map((index) => indexToOptionText(options, index)).join(', ')
  }

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !subject) return
      try {
        setIsLoading(true)
        const response = await fetch(`/api/wrong-answers/questions?userId=${user.id}&subject=${encodeURIComponent(subject)}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load questions')
        setQuestions(data.questions || [])
        setUserAnswers(new Array((data.questions || []).length).fill(null))
        setCurrentIndex(0)
        const minutes = Math.max((data.questions || []).length * 2, 2)
        setTimeLeft(minutes * 60)
        startTimeRef.current = Date.now()
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Could not load wrong answers.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (authLoading || !user?.id) {
      setIsLoading(false)
      return
    }
    load()
  }, [authLoading, user?.id, subject, toast])

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSelect = (index: number) => {
    if (isSubmitted) return
    setUserAnswers((prev) => {
      const next = [...prev]
      next[currentIndex] = [index]
      return next
    })
  }

  const handleMultiSelect = (index: number, maxSelections = 2) => {
    if (isSubmitted) return
    setUserAnswers((prev) => {
      const next = [...prev]
      const current = next[currentIndex] || []
      if (current.includes(index)) {
        next[currentIndex] = current.filter((v) => v !== index)
      } else if (current.length < maxSelections) {
        next[currentIndex] = [...current, index]
      }
      return next
    })
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitted) return
    if (timerRef.current) clearInterval(timerRef.current)
    setIsSubmitted(true)
    setIsLoading(true)

    const finalAnswers: UserAnswer[] = questions.map((q, idx) => {
      const selected = userAnswers[idx] || []
      const isCorrect = q.correctAnswers && q.correctAnswers.length > 0
        ? [...selected].sort().join(',') === [...q.correctAnswers].sort().join(',')
        : selected.length > 0 && selected[0] === q.correctAnswer
      return {
        questionId: q.id,
        subject: q.subject,
        questionNumber: q.questionNumber,
        selectedAnswer: selected.length > 0 ? selected : -1,
        isCorrect,
        timeSpent: 0,
      }
    })

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    const correctCount = finalAnswers.filter((answer) => answer.isCorrect).length
    const total = finalAnswers.length
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0
    setResultSummary({ total, correct: correctCount, score, duration })

    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          subject,
          answers: finalAnswers,
          duration,
        }),
      })
      toast({
        title: 'Practice submitted',
        description: 'Your progress has been saved.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save results.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Clock className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <p className="text-text-dark font-semibold">Login required</p>
            <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading && !isSubmitted) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Clock className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <AlertCircle className="mx-auto text-slate-400" size={44} />
            <p className="text-text-dark font-semibold">No wrong questions found.</p>
            <Button onClick={() => router.push('/wrong-answers')}>Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted && resultSummary) {
    const wrongAnswers: ReviewAnswer[] = questions
      .map((question, idx) => {
        const selected = userAnswers[idx] || []
        const correctAnswer = question.correctAnswers?.length
          ? question.correctAnswers.map((index: number) => indexToOptionText(question.options, index)).join(', ')
          : indexToOptionText(question.options, typeof question.correctAnswer === 'number' ? question.correctAnswer : -1)
        const isCorrect = question.correctAnswers && question.correctAnswers.length > 0
          ? [...selected].sort().join(',') === [...question.correctAnswers].sort().join(',')
          : selected.length > 0 && selected[0] === question.correctAnswer

        return {
          questionNumber: question.questionNumber || idx + 1,
          questionText: question.question || 'Question text unavailable.',
          yourAnswer: toOptionList(question.options, selected),
          correctAnswer,
          isCorrect,
          timeSpent: '0s',
          explanation: question.explanation || '',
        }
      })
      .filter((answer) => !answer.isCorrect)

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navigation />
        <main className="flex-1 pt-[100px] pb-12 px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="p-8 rounded-3xl text-center space-y-4 shadow-xl border-4 bg-emerald-50 border-emerald-500">
              <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-emerald-500 text-white">
                <Trophy size={40} />
              </div>
              <h1 className="text-4xl font-black text-slate-800">PRACTICE COMPLETE</h1>
              <p className="text-slate-600 font-medium">
                Subject: <span className="font-bold text-slate-800">{subject}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">Accuracy</p>
                  <p className="text-3xl font-black text-slate-800">{resultSummary.score}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">Correct</p>
                  <p className="text-3xl font-black text-emerald-500">{resultSummary.correct}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">Time Taken</p>
                  <p className="text-3xl font-black text-slate-800">
                    {Math.floor(resultSummary.duration / 60)}m {resultSummary.duration % 60}s
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1 h-12 text-lg bg-slate-800"
              >
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1 h-12 text-lg"
              >
                Practice Again
              </Button>
            </div>

            <AnswerBreakdown
              answers={wrongAnswers}
              title="WRONG ANSWERS REVIEW"
              emptyMessage="Great job! You corrected everything in this practice set."
              alwaysExpanded
            />
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
  const allowMultiple = Boolean(currentQuestion.allowMultiple || (currentQuestion.correctAnswers && currentQuestion.correctAnswers.length > 1))
  const maxSelections = currentQuestion.maxSelections || 2
  const selected = userAnswers[currentIndex] || []

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />
      <main className="flex-1 pt-[90px] pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Wrong Answer Practice</p>
              <h1 className="text-2xl font-black text-slate-800">{subject}</h1>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Timer size={18} />
              {formatTime(timeLeft)}
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Progress</span>
                <span className="text-xs font-bold text-slate-800">{currentIndex + 1} / {questions.length}</span>
              </div>
              <Progress value={progress} className="h-3 bg-slate-100" />
              <p className="mt-2 text-[11px] text-slate-500">
                Showing a maximum of 50 questions per practice session.
              </p>
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                If you think the question or answer is wrong, use the report button.
              </p>
            </CardContent>
          </Card>

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

              <Button
                onClick={handleSubmit}
                className="w-full bg-slate-800 hover:bg-slate-900 gap-2 h-12"
              >
                <Send size={18} />
                Finish Practice
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
                        questionId={currentQuestion.id}
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
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="gap-2 text-slate-500"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </Button>
                    {currentIndex < questions.length - 1 ? (
                      <Button onClick={handleNext} className="bg-slate-800 hover:bg-slate-900 px-8">
                        Save & Next
                        <ChevronRight size={18} className="ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} className="bg-[#0F7938] hover:bg-[#0F7938]/90 text-white px-10 font-bold">
                        Submit Set
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
