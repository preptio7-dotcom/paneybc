'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Info, RefreshCw } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { LogOut } from 'lucide-react'
import { ReportQuestionButton } from '@/components/report-question-button'

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
    explanation: string
    difficulty: string
}

export default function PracticePage() {
    const { code } = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()

    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOptions, setSelectedOptions] = useState<number[]>([])
    const [isAnswered, setIsAnswered] = useState(false)
    const [isChecked, setIsChecked] = useState(false)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [showAnswer, setShowAnswer] = useState(false)
    const [showExplanation, setShowExplanation] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [score, setScore] = useState(0)
    const [sessionAnswers, setSessionAnswers] = useState<any[]>([])
    const { user, loading: authLoading } = useAuth()
    const [isFinishing, setIsFinishing] = useState(false)
    const [authToastShown, setAuthToastShown] = useState(false)
    const getQuestionId = (q: Question) => q.id ?? q._id ?? ''

    const chapterParam = useMemo(() => searchParams.get('chapter') || '', [searchParams])
    const difficultyParam = useMemo(() => (searchParams.get('difficulty') || '').toLowerCase(), [searchParams])

    const shuffleArray = <T,>(items: T[]) => {
        if (items.length <= 1) return items
        const copy = items.slice()
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[copy[i], copy[j]] = [copy[j], copy[i]]
        }
        return copy
    }

    const sampleArray = <T,>(items: T[], count: number) => {
        if (count >= items.length) return items.slice()
        return shuffleArray(items).slice(0, count)
    }

    useEffect(() => {
        if (authLoading || !user) {
            setIsLoading(false)
            return
        }
        fetchQuestions()
    }, [authLoading, user, code, chapterParam, difficultyParam])

    useEffect(() => {
        if (!authLoading && !user && !authToastShown) {
            toast({
                title: "Login required",
                description: "Please log in to start a practice session.",
                variant: "destructive"
            })
            setAuthToastShown(true)
        }
    }, [authLoading, user, authToastShown, toast])

    const fetchQuestions = async () => {
        try {
            setIsLoading(true)
            const chapterQuery = chapterParam ? `&chapter=${chapterParam}` : ''
            const difficultyQuery = ['easy', 'medium', 'hard'].includes(difficultyParam)
                ? `&difficulty=${difficultyParam}`
                : ''
            const limitParam = chapterParam ? '&limit=all' : '&limit=50'

            if (chapterParam && (!difficultyParam || difficultyParam === 'mixed')) {
                const [easyRes, mediumRes, hardRes] = await Promise.all([
                    fetch(`/api/questions?subject=${encodeURIComponent(String(code || ''))}${chapterQuery}&difficulty=easy&limit=all&shuffle=1`),
                    fetch(`/api/questions?subject=${encodeURIComponent(String(code || ''))}${chapterQuery}&difficulty=medium&limit=all&shuffle=1`),
                    fetch(`/api/questions?subject=${encodeURIComponent(String(code || ''))}${chapterQuery}&difficulty=hard&limit=all&shuffle=1`),
                ])
                if (!easyRes.ok || !mediumRes.ok || !hardRes.ok) {
                    throw new Error('Failed to fetch questions')
                }
                const [easyData, mediumData, hardData] = await Promise.all([
                    easyRes.json(),
                    mediumRes.json(),
                    hardRes.json(),
                ])

                const easyList: Question[] = easyData.questions || []
                const mediumList: Question[] = mediumData.questions || []
                const hardList: Question[] = hardData.questions || []

                const totalAvailable = easyList.length + mediumList.length + hardList.length
                if (totalAvailable === 0) {
                    setQuestions([])
                    return
                }

                const easyQueue = shuffleArray(easyList)
                const mediumQueue = shuffleArray(mediumList)
                const hardQueue = shuffleArray(hardList)

                const ratioSequence: Array<'easy' | 'medium' | 'hard'> = [
                    'hard', 'hard', 'hard',
                    'medium', 'medium', 'medium', 'medium',
                    'easy', 'easy', 'easy',
                ]

                const mixed: Question[] = []
                while (easyQueue.length || mediumQueue.length || hardQueue.length) {
                    for (const level of ratioSequence) {
                        if (level === 'easy' && easyQueue.length) {
                            mixed.push(easyQueue.shift() as Question)
                        } else if (level === 'medium' && mediumQueue.length) {
                            mixed.push(mediumQueue.shift() as Question)
                        } else if (level === 'hard' && hardQueue.length) {
                            mixed.push(hardQueue.shift() as Question)
                        }
                    }
                    if (!easyQueue.length && !mediumQueue.length && !hardQueue.length) {
                        break
                    }
                }

                setQuestions(mixed)
                return
            }

            const response = await fetch(`/api/questions?subject=${encodeURIComponent(String(code || ''))}${chapterQuery}${difficultyQuery}${limitParam}&shuffle=1`)
            if (!response.ok) throw new Error('Failed to fetch questions')
            const data = await response.json()
            setQuestions(data.questions)
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not load questions. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleOptionSelect = (index: number) => {
        if (isAnswered) return
        const allowMultiple = currentQuestion?.allowMultiple || (currentQuestion?.correctAnswers && currentQuestion.correctAnswers.length > 1)
        const maxSelections = currentQuestion?.maxSelections || 2
        if (!allowMultiple) {
            setSelectedOptions([index])
            return
        }
        setSelectedOptions((prev) => {
            if (prev.includes(index)) {
                return prev.filter((v) => v !== index)
            }
            if (prev.length >= maxSelections) return prev
            return [...prev, index]
        })
    }

    const handleCheckAnswer = () => {
        if (selectedOptions.length === 0 || isAnswered) return

        setIsAnswered(true)
        setIsChecked(true)
        const current = questions[currentIndex]
        const isCorrect = current.correctAnswers && current.correctAnswers.length > 0
            ? [...selectedOptions].sort().join(',') === [...current.correctAnswers].sort().join(',')
            : selectedOptions[0] === current.correctAnswer
        setIsCorrect(isCorrect)

        // Track the answer
            setSessionAnswers(prev => [
            ...prev,
            {
                questionId: getQuestionId(questions[currentIndex]),
                subject: questions[currentIndex].subject,
                questionNumber: questions[currentIndex].questionNumber,
                selectedAnswer: selectedOptions.length > 0 ? selectedOptions : -1,
                isCorrect,
                timeSpent: 0
            }
        ])

        if (isCorrect) {
            setScore(prev => prev + 1)
            toast({
                title: "Correct!",
                description: "Well done, keep it up.",
            })
        } else {
            toast({
                title: "Incorrect",
                description: "Check the explanation below.",
                variant: "destructive"
            })
            setShowAnswer(true)
            setShowExplanation(true)
        }
    }

    const handleFinish = async () => {
        if (sessionAnswers.length === 0) {
            router.push('/dashboard')
            return
        }

        try {
            setIsFinishing(true)
            const response = await fetch('/api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    subject: code,
                    answers: sessionAnswers,
                    duration: 0
                })
            })

            if (response.ok) {
                toast({
                    title: "Practice Finished",
                    description: "Your progress has been saved to your dashboard.",
                })
            }
            router.push('/dashboard')
        } catch (error) {
            console.error('Failed to save practice results:', error)
            router.push('/dashboard')
        } finally {
            setIsFinishing(false)
        }
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setSelectedOptions([])
            setIsAnswered(false)
            setIsChecked(false)
            setIsCorrect(null)
            setShowAnswer(false)
            setShowExplanation(false)
        }
    }

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
            setSelectedOptions([])
            setIsAnswered(false)
            setIsChecked(false)
            setIsCorrect(null)
            setShowAnswer(false)
            setShowExplanation(false)
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-primary-green" size={40} />
                    <p className="text-slate-600 font-medium">Loading your practice session...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-8">
                    <CardTitle className="mb-2">Create an account to practice</CardTitle>
                    <p className="text-slate-600 mb-6">
                        Sign up to save your progress, or try a quick demo first.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Button onClick={() => router.push('/auth/signup')}>Create Free Account</Button>
                        <Button variant="outline" onClick={() => router.push('/demo')}>Try Demo</Button>
                        <Button variant="ghost" onClick={() => router.push('/auth/login')}>Log In</Button>
                        <Button variant="outline" onClick={() => router.push(`/subjects/${encodeURIComponent(String(code || ''))}`)}>Back to Subject</Button>
                    </div>
                </Card>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-primary-green" size={40} />
                    <p className="text-slate-600 font-medium">Loading your practice session...</p>
                </div>
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-8">
                    <Info className="mx-auto text-slate-400 mb-4" size={48} />
                    <CardTitle className="mb-2">No Questions Found</CardTitle>
                    <p className="text-slate-600 mb-6">We couldn't find any questions for "{code}".</p>
                    <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]
    const optionItems = currentQuestion.options
        .map((option, index) => ({
            text: option?.trim() || '',
            originalIndex: index
        }))
        .filter(option => option.text.length > 0)
    const progress = ((currentIndex + 1) / questions.length) * 100
    const allowMultiple = Boolean(currentQuestion?.allowMultiple || (currentQuestion?.correctAnswers && currentQuestion.correctAnswers.length > 1))
    const maxSelections = currentQuestion?.maxSelections || 2
    const correctAnswers = currentQuestion?.correctAnswers && currentQuestion.correctAnswers.length > 0
        ? currentQuestion.correctAnswers
        : typeof currentQuestion?.correctAnswer === 'number'
            ? [currentQuestion.correctAnswer]
            : []

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navigation />

            <main className="flex-1 pt-[90px] pb-12 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header/Stats */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-bold text-slate-800">Practice: {code}</h2>
                            <p className="text-sm text-slate-500">Question {currentIndex + 1} of {questions.length}</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Score</p>
                                <p className="text-2xl font-black text-primary-green">{score}/{questions.length}</p>
                            </div>
                            <Button
                                onClick={handleFinish}
                                disabled={isFinishing}
                                className="bg-rose-500 hover:bg-rose-600 text-white gap-2 h-10 px-4"
                            >
                                <LogOut size={16} />
                                Finish Session
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                            If you think the question or answer is wrong, use the report button.
                        </p>
                    </div>

                    {/* Question Card */}
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardHeader className="bg-slate-800 text-white py-5">
                            <div className="flex justify-between items-start gap-4">
                                <span className="bg-primary-green/20 text-primary-green text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-primary-green/30">
                                    {currentQuestion.difficulty}
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
                            <CardTitle className="text-lg md:text-xl font-medium leading-snug mt-3">
                                {currentQuestion.question}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 md:p-6 space-y-4">
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
                                {optionItems.map((option, index) => {
                                    const isCorrectOption = (isChecked || showAnswer) && correctAnswers.includes(option.originalIndex)
                                    const isSelected = selectedOptions.includes(option.originalIndex)
                                    const isWrong = isChecked && isSelected && !correctAnswers.includes(option.originalIndex)

                                    return (
                                        <button
                                            key={option.originalIndex}
                                            onClick={() => handleOptionSelect(option.originalIndex)}
                                            disabled={isAnswered}
                                            className={`
                        flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
                        ${isSelected && !isAnswered ? 'border-primary-green bg-primary-green/5 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}
                        ${isCorrectOption ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : ''}
                        ${isWrong ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500' : ''}
                        disabled:cursor-default
                      `}
                                        >
                                            <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                        ${isSelected && !isAnswered ? 'bg-primary-green text-white' : 'bg-slate-100 text-slate-500'}
                        ${isCorrectOption ? 'bg-emerald-500 text-white' : ''}
                        ${isWrong ? 'bg-rose-500 text-white' : ''}
                      `}>
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <span className={`flex-1 font-medium ${isAnswered ? 'text-slate-700' : 'text-slate-600'}`}>
                                                {option.text}
                                            </span>
                                            {isCorrectOption && <CheckCircle2 className="text-emerald-500" size={20} />}
                                            {isWrong && <XCircle className="text-rose-500" size={20} />}
                                        </button>
                                    )
                                })}
                                {allowMultiple && (
                                    <p className="text-xs font-semibold text-amber-900 bg-amber-100/80 border border-amber-300 rounded-md px-3 py-2">
                                        Select up to {maxSelections} options.
                                    </p>
                                )}
                            </div>

                            {/* Action Section */}
                            <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handlePrevious}
                                        disabled={currentIndex === 0}
                                        className="gap-2"
                                    >
                                        <ChevronLeft size={16} />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleNext}
                                        disabled={currentIndex === questions.length - 1}
                                        className="gap-2"
                                    >
                                        Next
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                    <Button
                                        onClick={handleCheckAnswer}
                                        disabled={selectedOptions.length === 0 || isChecked}
                                        className="px-6 bg-slate-800 hover:bg-slate-900"
                                    >
                                        Check Answer
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAnswer((prev) => !prev)}
                                        className="px-6"
                                    >
                                        {showAnswer ? 'Hide Answer' : 'Show Answer'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowExplanation((prev) => !prev)}
                                        className="px-6"
                                    >
                                        {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
                                    </Button>
                                </div>
                            </div>

                            {/* Explanation Section */}
                            {(showExplanation || (isChecked && isCorrect === false)) && (
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

                            {(showAnswer || (isChecked && isCorrect === false)) && correctAnswers.length > 0 && (
                                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                                    Correct Answer: {correctAnswers.map((idx) => String.fromCharCode(65 + idx)).join(', ')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
