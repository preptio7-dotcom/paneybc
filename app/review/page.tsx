'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import { CheckCircle2, XCircle, Info, RefreshCw } from 'lucide-react'
import { ReportQuestionButton } from '@/components/report-question-button'

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
  explanation: string
}

export default function ReviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [authToastShown, setAuthToastShown] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [isAnswered, setIsAnswered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const getQuestionId = (q: Question) => q.id ?? q._id ?? ''

  useEffect(() => {
    const loadDueQuestions = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/review/due?limit=50')
        if (!response.ok) throw new Error('Failed to load review questions')
        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load review questions.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadDueQuestions()
    } else {
      setIsLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to access your review queue.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  const progress = useMemo(() => {
    if (questions.length === 0) return 0
    return ((currentIndex + 1) / questions.length) * 100
  }, [currentIndex, questions.length])

  const currentQuestion = questions[currentIndex]
  const optionItems = currentQuestion?.options
    ? currentQuestion.options
        .map((option, index) => ({
          text: option?.trim() || '',
          originalIndex: index,
        }))
        .filter(option => option.text.length > 0)
    : []

  const currentCorrectAnswers = currentQuestion?.correctAnswers && currentQuestion.correctAnswers.length > 0
    ? currentQuestion.correctAnswers
    : typeof currentQuestion?.correctAnswer === 'number'
      ? [currentQuestion.correctAnswer]
      : []
  const allowMultiple = Boolean(currentQuestion?.allowMultiple || currentCorrectAnswers.length > 1)
  const maxSelections = currentQuestion?.maxSelections || 2

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return
    if (!allowMultiple) {
      setSelectedOptions([index])
      return
    }
    setSelectedOptions((prev) => {
      if (prev.includes(index)) {
        return prev.filter((value) => value !== index)
      }
      if (prev.length >= maxSelections) {
        return prev
      }
      return [...prev, index]
    })
  }

  const handleCheckAnswer = async () => {
    if (selectedOptions.length === 0 || isAnswered || !currentQuestion) return

    const isCorrect = currentCorrectAnswers.length > 0
      ? [...selectedOptions].sort().join(',') === [...currentCorrectAnswers].sort().join(',')
      : false
    setIsAnswered(true)

    if (isCorrect) {
      setScore(prev => prev + 1)
      toast({
        title: 'Correct!',
        description: 'Nice work. Keep the streak going.',
      })
    } else {
      toast({
        title: 'Incorrect',
        description: 'Review the explanation before moving on.',
        variant: 'destructive',
      })
    }

    const currentQuestionId = getQuestionId(currentQuestion)
    if (!reviewedIds.has(currentQuestionId)) {
      setReviewedIds(prev => new Set(prev).add(currentQuestionId))
      await fetch('/api/review/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: [
            {
              questionId: currentQuestionId,
              isCorrect,
            },
          ],
        }),
      })
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOptions([])
      setIsAnswered(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setSelectedOptions([])
      setIsAnswered(false)
    }
  }

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">Log in to access your review queue.</p>
            <Button onClick={() => router.push('/auth/login')}>Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <p className="text-text-dark font-semibold">You are all caught up!</p>
            <p className="text-text-light text-sm">No review questions are due right now.</p>
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <Navigation />

      <main className="flex-1 pt-[90px] pb-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Spaced Repetition Review</h2>
              <p className="text-sm text-slate-500">Question {currentIndex + 1} of {questions.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Score</p>
              <p className="text-2xl font-black text-primary-green">{score}/{questions.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              If you think the question or answer is wrong, use the report button.
            </p>
          </div>

          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-slate-800 text-white py-6">
              <div className="flex justify-between items-start gap-4">
                <span className="bg-primary-green/20 text-primary-green text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-primary-green/30">
                  {currentQuestion.subject}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs font-mono">Q#{currentQuestion.questionNumber}</span>
                  <ReportQuestionButton
                    questionId={getQuestionId(currentQuestion)}
                    subject={currentQuestion.subject}
                    questionNumber={currentQuestion.questionNumber}
                  />
                </div>
              </div>
              <CardTitle className="text-lg md:text-xl font-medium leading-relaxed mt-4">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-6">
              {currentQuestion.imageUrl ? (
                <div className="w-full">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question diagram"
                    className="w-full max-h-80 object-contain rounded-lg border border-border bg-white"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3">
                {optionItems.map((option, index) => {
                  const isCorrect = isAnswered && currentCorrectAnswers.includes(option.originalIndex)
                  const isWrong = isAnswered && selectedOptions.includes(option.originalIndex) && !currentCorrectAnswers.includes(option.originalIndex)
                  const isSelected = selectedOptions.includes(option.originalIndex)

                  return (
                    <button
                      key={option.originalIndex}
                      onClick={() => handleOptionSelect(option.originalIndex)}
                      disabled={isAnswered}
                      className={`
                        flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200
                        ${isSelected && !isAnswered ? 'border-primary-green bg-primary-green/5 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}
                        ${isCorrect ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : ''}
                        ${isWrong ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500' : ''}
                        disabled:cursor-default
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                        ${isSelected && !isAnswered ? 'bg-primary-green text-white' : 'bg-slate-100 text-slate-500'}
                        ${isCorrect ? 'bg-emerald-500 text-white' : ''}
                        ${isWrong ? 'bg-rose-500 text-white' : ''}
                      `}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className={`flex-1 font-medium ${isAnswered ? 'text-slate-700' : 'text-slate-600'}`}>
                        {option.text}
                      </span>
                      {isCorrect && <CheckCircle2 className="text-emerald-500" size={20} />}
                      {isWrong && <XCircle className="text-rose-500" size={20} />}
                    </button>
                  )
                })}
              </div>
              {allowMultiple && (
                <p className="text-xs text-slate-500">Select up to {maxSelections} options.</p>
              )}

              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="gap-2"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    disabled={!isAnswered}
                    className="gap-2"
                  >
                    Next
                  </Button>
                </div>

                {!isAnswered ? (
                  <Button
                    onClick={handleCheckAnswer}
                    disabled={selectedOptions.length === 0}
                    className="w-full md:w-auto px-10 bg-slate-800 hover:bg-slate-900"
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="w-full md:w-auto px-10 bg-[#0F7938] hover:bg-[#0F7938]/90 text-white shadow-md transition-all"
                  >
                    Continue
                  </Button>
                )}
              </div>

              {isAnswered && (
                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2 text-slate-800 font-bold mb-3">
                    <Info size={18} className="text-primary-green" />
                    <h3>Explanation</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed italic">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
