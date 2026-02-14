'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TestHeader } from '@/components/test-header'
import { QuestionCard } from '@/components/question-card'
import { QuestionOverview } from '@/components/question-overview'
import { TestNavigation } from '@/components/test-navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

interface Subject {
  id?: string
  _id?: string
  name: string
  code: string
  description?: string
}

interface Question {
  id?: string
  _id?: string
  subject: string
  questionNumber: number
  question: string
  imageUrl?: string
  options: string[]
  correctAnswer: number
  correctAnswers?: number[]
  allowMultiple?: boolean
  maxSelections?: number
}

const DEFAULT_TIME_SECONDS = 60 * 60

export default function TestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [authToastShown, setAuthToastShown] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState<(number[] | null)[]>([])
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIME_SECONDS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const getQuestionId = (q: Question) => q.id ?? q._id ?? ''

  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(false)
      return
    }
    const loadSubjects = async () => {
      try {
        const response = await fetch('/api/admin/subjects')
        const data = await response.json()
        const list = data.subjects || []
        setSubjects(list)

        const subjectFromUrl = searchParams.get('subject')
        if (subjectFromUrl && list.some((s: Subject) => s.code === subjectFromUrl)) {
          setSelectedSubject(subjectFromUrl)
          return
        }

        if (list.length > 0) {
          setSelectedSubject(list[0].code)
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load subjects.',
          variant: 'destructive',
        })
      }
    }

    loadSubjects()
  }, [authLoading, user, searchParams, toast])

  useEffect(() => {
    if (authLoading || !user || !selectedSubject) return

    const loadQuestions = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/questions?subject=${encodeURIComponent(selectedSubject)}&limit=25&shuffle=1`)
        if (!response.ok) throw new Error('Failed to load questions')
        const data = await response.json()
        const list = data.questions || []
        setQuestions(list)
        setAnswers(new Array(list.length).fill(null))
        setCurrentQuestion(1)
        setTimeRemaining(DEFAULT_TIME_SECONDS)
        startTimeRef.current = Date.now()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load test questions.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadQuestions()
  }, [authLoading, user, selectedSubject, toast])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to start a test.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">Login required</p>
            <p className="text-text-light text-sm">Please log in to access tests.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => router.push('/')}>Back to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    if (isLoading || isSubmitting || questions.length === 0) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmitTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isLoading, isSubmitting, questions.length])

  const answeredQuestions = useMemo(() => {
    const answered = new Set<number>()
    answers.forEach((answer, index) => {
      if (answer && answer.length > 0) {
        answered.add(index + 1)
      }
    })
    return answered
  }, [answers])

  const handleAnswerSelect = (answerId: string) => {
    const selectedIndex = Number(answerId)
    setAnswers(prev => {
      const updated = [...prev]
      updated[currentQuestion - 1] = Number.isNaN(selectedIndex) ? null : [selectedIndex]
      return updated
    })
  }

  const handleMultiSelect = (answerIds: string[]) => {
    const selected = answerIds.map((id) => Number(id)).filter((v) => !Number.isNaN(v))
    setAnswers(prev => {
      const updated = [...prev]
      updated[currentQuestion - 1] = selected
      return updated
    })
  }

  const handlePrevious = () => {
    setCurrentQuestion(prev => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentQuestion(prev => Math.min(questions.length, prev + 1))
  }

  const handleSubmitTest = async () => {
    if (isSubmitting || questions.length === 0) return

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
        timeSpent: 0,
      }
    })

    const duration = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000))

    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          subject: selectedSubject,
          answers: finalAnswers,
          duration,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save results')
      }

      const data = await response.json()
      const resultId = data.result?.id ?? data.result?._id
      router.push(resultId ? `/results?id=${resultId}` : '/results')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit the test. Please try again.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (subjects.length === 0) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">No subjects available.</p>
            <p className="text-text-light text-sm">Please contact an admin to add subjects.</p>
            <Button onClick={() => router.push('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">No questions found for this subject.</p>
            <p className="text-text-light text-sm">Try another subject to start a test.</p>
            <div className="flex flex-col gap-2">
              {subjects.map((subject, idx) => (
                <Button
                  key={subject._id ?? subject.code ?? `${subject.name ?? 'subject'}-${idx}`}
                  variant={subject.code === selectedSubject ? 'default' : 'outline'}
                  onClick={() => setSelectedSubject(subject.code)}
                  className="text-left whitespace-normal break-words h-auto py-2 leading-snug"
                >
                  {subject.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const current = questions[currentQuestion - 1]
  const questionOptions = current.options
    .map((option, index) => ({
      id: String(index),
      letter: String.fromCharCode(65 + index),
      text: option?.trim() || '',
    }))
    .filter(option => option.text.length > 0)

  const allowMultiple = Boolean(current.allowMultiple || (current.correctAnswers && current.correctAnswers.length > 1))
  const selectedAnswers = answers[currentQuestion - 1] || []

  return (
    <main className="min-h-screen bg-background-light">
      <TestHeader
        currentQuestion={currentQuestion}
        totalQuestions={questions.length}
        timeRemaining={timeRemaining}
        onEndTest={handleSubmitTest}
      />

      <div className="pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {subjects.map((subject, idx) => (
              <Button
                key={subject._id ?? subject.code ?? `${subject.name ?? 'subject'}-${idx}`}
                size="sm"
                variant={subject.code === selectedSubject ? 'default' : 'outline'}
                onClick={() => setSelectedSubject(subject.code)}
                className="text-left whitespace-normal break-words h-auto py-2 leading-snug"
              >
                {subject.name}
              </Button>
            ))}
          </div>

          <div className="flex gap-6">
            <div className="flex-1 max-w-2xl">
              <QuestionCard
                questionNumber={current.questionNumber || currentQuestion}
                questionText={current.question}
                questionId={getQuestionId(current)}
                subject={current.subject}
                imageUrl={current.imageUrl}
                options={questionOptions}
                selectedAnswer={
                  !allowMultiple && selectedAnswers.length > 0 ? String(selectedAnswers[0]) : undefined
                }
                selectedAnswers={allowMultiple ? selectedAnswers.map(String) : undefined}
                allowMultiple={allowMultiple}
                maxSelections={current.maxSelections || 2}
                onAnswerSelect={handleAnswerSelect}
                onMultiSelect={handleMultiSelect}
              />

              <TestNavigation
                currentQuestion={currentQuestion}
                totalQuestions={questions.length}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSubmit={handleSubmitTest}
              />
            </div>

            <QuestionOverview
              totalQuestions={questions.length}
              answeredQuestions={answeredQuestions}
              currentQuestion={currentQuestion}
              onQuestionSelect={setCurrentQuestion}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
