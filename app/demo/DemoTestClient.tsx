'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PerformanceSummary } from '@/components/performance-summary'
import { Loader2, Timer, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Navigation } from '@/components/navigation'

interface Question {
  id?: string
  _id?: string
  subject: string
  questionNumber: number
  question: string
  imageUrl?: string
  options: string[]
  correctAnswer?: number
  correctAnswers?: number[]
  allowMultiple?: boolean
  maxSelections?: number
}

const DEFAULT_DEMO_LIMIT = 10
const DEFAULT_TIME_SECONDS = 20 * 60

export default function DemoTestClient() {
  const router = useRouter()
  const { toast } = useToast()

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState<(number[] | null)[]>([])
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIME_SECONDS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [demoConfig, setDemoConfig] = useState({
    enabled: true,
    maxQuestions: DEFAULT_DEMO_LIMIT,
    timeMinutes: 20,
  })
  const [demoDisabled, setDemoDisabled] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [result, setResult] = useState<{
    total: number
    correct: number
    wrong: number
    notAttempted: number
    score: number
    duration: number
  } | null>(null)

  const startTimeRef = useRef<number>(Date.now())
  const getQuestionId = (q: Question) => q.id ?? q._id ?? ''

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsResponse = await fetch('/api/public/settings')
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          const testSettings = settingsData?.testSettings || {}
          const enabled = typeof testSettings.demoEnabled === 'boolean' ? testSettings.demoEnabled : true
          const maxQuestions = Math.min(
            10,
            Math.max(1, Number(testSettings.demoMaxQuestions) || DEFAULT_DEMO_LIMIT)
          )
          const timeMinutes = Math.max(5, Number(testSettings.demoTimeMinutes) || 20)
          setDemoConfig({ enabled, maxQuestions, timeMinutes })
          setDemoDisabled(!enabled)
        }
      } catch (error) {
        // ignore, fall back to defaults
      } finally {
        setSettingsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return
    if (demoDisabled) {
      setIsLoading(false)
      return
    }

    const loadQuestions = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/demo/questions?limit=${demoConfig.maxQuestions}`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load demo questions')
        }
        const list = data.questions || []
        setQuestions(list)
        setAnswers(new Array(list.length).fill(null))
        setCurrentQuestion(1)
        setTimeRemaining((demoConfig.timeMinutes || 20) * 60)
        startTimeRef.current = Date.now()
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load demo questions.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadQuestions()
  }, [settingsLoaded, demoDisabled, demoConfig.maxQuestions, demoConfig.timeMinutes, toast])

  useEffect(() => {
    if (isLoading || isSubmitting || questions.length === 0 || result) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmitTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isLoading, isSubmitting, questions.length, result])

  const handleAnswerSelect = (selectedIndex: number) => {
    setAnswers((prev) => {
      const updated = [...prev]
      updated[currentQuestion - 1] = Number.isNaN(selectedIndex) ? null : [selectedIndex]
      return updated
    })
  }

  const handleMultiSelect = (optionIndex: number, maxSelections = 2) => {
    setAnswers((prev) => {
      const updated = [...prev]
      const current = updated[currentQuestion - 1] || []
      if (current.includes(optionIndex)) {
        updated[currentQuestion - 1] = current.filter((v) => v !== optionIndex)
      } else if (current.length < maxSelections) {
        updated[currentQuestion - 1] = [...current, optionIndex]
      }
      return updated
    })
  }

  const handlePrevious = () => {
    setCurrentQuestion((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentQuestion((prev) => Math.min(questions.length, prev + 1))
  }

  const handleSubmitTest = () => {
    if (isSubmitting || questions.length === 0 || result) return

    setIsSubmitting(true)

    const finalAnswers = questions.map((question, index) => {
      const selected = answers[index]
      return {
        questionId: getQuestionId(question),
        subject: question.subject,
        questionNumber: question.questionNumber,
        selectedAnswer: selected && selected.length > 0 ? selected : -1,
        isCorrect: (() => {
          if (!selected || selected.length === 0) return false
          if (question.correctAnswers && question.correctAnswers.length > 0) {
            const a = [...selected].sort().join(',')
            const b = [...question.correctAnswers].sort().join(',')
            return a === b
          }
          return selected[0] === question.correctAnswer
        })(),
      }
    })

    const total = finalAnswers.length
    const correct = finalAnswers.filter((a) => a.isCorrect).length
    const wrong = finalAnswers.filter((a) => {
      const selected = a.selectedAnswer
      const hasSelection = Array.isArray(selected) ? selected.length > 0 : selected !== -1
      return !a.isCorrect && hasSelection
    }).length
    const notAttempted = finalAnswers.filter((a) => {
      const selected = a.selectedAnswer
      return Array.isArray(selected) ? selected.length === 0 : selected === -1
    }).length
    const score = Math.round((correct / Math.max(1, total)) * 100)
    const duration = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000))

    setResult({
      total,
      correct,
      wrong,
      notAttempted,
      score,
      duration,
    })
    setIsSubmitting(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            {demoDisabled ? (
              <>
                <p className="text-text-dark font-semibold">Demo test is currently disabled.</p>
                <p className="text-text-light text-sm">Please sign in to access full practice.</p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => router.push('/auth/signup')}>Create Free Account</Button>
                  <Button variant="outline" onClick={() => router.push('/auth/login')}>Log In</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-text-dark font-semibold">No demo questions available.</p>
                <p className="text-text-light text-sm">Please try again later.</p>
                <Button onClick={() => router.push('/')}>Back to Home</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navigation />
        <main className="flex-1 pt-[90px] pb-12 px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="border-border bg-white">
              <CardContent className="p-6 text-center space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Demo Results</p>
                <h1 className="font-heading text-3xl font-bold text-text-dark">{result.score}%</h1>
                <p className="text-text-light">
                  You answered {result.correct} out of {result.total} questions correctly.
                </p>
                <p className="text-sm text-text-light">
                  Unlock full practice mode, explanations, and progress tracking by signing in.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                  <Button onClick={() => router.push('/auth/signup')}>Create Free Account</Button>
                  <Button variant="outline" onClick={() => router.push('/auth/login')}>Log In</Button>
                  <Button variant="ghost" onClick={() => window.location.reload()}>Try Another Demo</Button>
                </div>
              </CardContent>
            </Card>

            <PerformanceSummary
              correctAnswers={result.correct}
              wrongAnswers={result.wrong}
              notAttempted={result.notAttempted}
              accuracy={result.score}
            />
          </div>
        </main>
      </div>
    )
  }

  const currentIndex = currentQuestion - 1
  const current = questions[currentIndex]
  const optionItems = current.options
    .map((option, index) => ({
      text: option?.trim() || '',
      originalIndex: index,
    }))
    .filter((option) => option.text.length > 0)

  const allowMultiple = Boolean(current.allowMultiple || (current.correctAnswers && current.correctAnswers.length > 1))
  const maxSelections = current.maxSelections || 2
  const selectedAnswers = answers[currentIndex] || []
  const progress = (currentQuestion / questions.length) * 100

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />

      <main className="flex-1 pt-[80px] pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
            <span className="text-xs text-slate-500">Demo Test</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1 shadow-sm border-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${timeRemaining < 60 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                    <Timer size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Time Remaining</p>
                    <p className={`text-xl font-black font-mono ${timeRemaining < 60 ? 'text-rose-500' : 'text-slate-800'}`}>
                      {formatTime(timeRemaining)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 shadow-sm border-0">
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Progress</span>
                  <span className="text-xs font-bold text-slate-800">{currentQuestion} / {questions.length}</span>
                </div>
                <Progress value={progress} className="h-3 bg-slate-100" />
                <p className="mt-2 text-xs text-slate-500">
                  Demo mode: {demoConfig.maxQuestions} questions - {demoConfig.timeMinutes} min limit
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
                        onClick={() => setCurrentQuestion(idx + 1)}
                        className={`
                          w-8 h-8 rounded-md text-[10px] font-bold transition-all
                          ${currentQuestion === idx + 1 ? 'ring-2 ring-primary-green ring-offset-2' : ''}
                          ${answers[idx] !== null ? 'bg-primary-green text-white' : 'bg-slate-100 text-slate-500'}
                        `}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleSubmitTest}
                className="w-full bg-slate-800 hover:bg-slate-900 gap-2 h-12"
              >
                <Send size={18} />
                Finish Demo
              </Button>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <Card className="border-0 shadow-xl overflow-hidden min-h-[420px] flex flex-col">
                <CardHeader className="bg-slate-800 text-white p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase">
                      Question {currentQuestion}
                    </span>
                    <span className="text-white/60 text-xs font-mono">
                      Subject: {current.subject}
                    </span>
                  </div>
                  <CardTitle className="text-lg md:text-xl font-medium leading-snug">
                    {current.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col gap-3">
                  {current.imageUrl ? (
                    <div className="w-full">
                      <img
                        src={current.imageUrl}
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
                        onClick={() => allowMultiple ? handleMultiSelect(option.originalIndex, maxSelections) : handleAnswerSelect(option.originalIndex)}
                        className={`
                          group flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
                          ${selectedAnswers.includes(option.originalIndex)
                            ? 'border-primary-green bg-primary-green/5 shadow-inner'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors
                          ${selectedAnswers.includes(option.originalIndex) ? 'bg-primary-green text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}
                        `}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className={`flex-1 text-base font-medium ${selectedAnswers.includes(option.originalIndex) ? 'text-slate-800' : 'text-slate-600'}`}>
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
                      onClick={handlePrevious}
                      disabled={currentQuestion === 1}
                      className="gap-2 text-slate-500"
                    >
                      <ChevronLeft size={20} />
                      Back
                    </Button>

                    {currentQuestion < questions.length ? (
                      <Button
                        onClick={handleNext}
                        className="bg-slate-800 hover:bg-slate-900 px-8"
                      >
                        Save & Next
                        <ChevronRight size={20} className="ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitTest}
                        className="bg-[#0F7938] hover:bg-[#0F7938]/90 text-white px-10 font-bold shadow-md transition-all"
                      >
                        Submit Test
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:hidden">
                <Button
                  onClick={handleSubmitTest}
                  className="w-full bg-slate-800 hover:bg-slate-900 gap-2 h-14 text-lg font-bold shadow-lg"
                >
                  <Send size={20} />
                  Finish Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


