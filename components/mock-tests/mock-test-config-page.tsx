'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2, BookOpen, Calculator, Loader2, Minus, Plus } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import {
  calculateMockTimeAllowedMinutes,
  clampMockQuestionCount,
  MOCK_TEST_DEFINITIONS,
  type MockTestRouteKey,
} from '@/lib/mock-tests'

type ConfigPayload = {
  success: boolean
  canStart: boolean
  comingSoon: boolean
  availability: {
    total: number
    bySubject: Array<{
      code: string
      count: number
    }>
    vol1?: number
    vol2?: number
  }
  defaults: {
    totalQuestions: number
    timeAllowedMinutes: number
  }
  errorMessage: string | null
}

const ICON_BY_NAME = {
  BookOpen,
  Calculator,
  BarChart2,
} as const

export function MockTestConfigPage({ mockKey }: { mockKey: MockTestRouteKey }) {
  const definition = MOCK_TEST_DEFINITIONS[mockKey]
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()

  const [config, setConfig] = useState<ConfigPayload | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [questionCount, setQuestionCount] = useState(definition.defaultQuestions)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [notifyLoading, setNotifyLoading] = useState(false)

  const HeaderIcon = ICON_BY_NAME[definition.icon]

  useEffect(() => {
    if (loading || !user) {
      setIsLoadingConfig(false)
      return
    }

    const fetchConfig = async () => {
      try {
        setIsLoadingConfig(true)
        const response = await fetch(`/api/mock-tests/${definition.routeKey}/config`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load configuration')
        }
        setConfig(data)
        setQuestionCount(clampMockQuestionCount(definition, Number(data?.defaults?.totalQuestions)))
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || `Failed to load ${definition.testName} configuration.`,
          variant: 'destructive',
        })
      } finally {
        setIsLoadingConfig(false)
      }
    }

    void fetchConfig()
  }, [definition, loading, toast, user])

  const timeAllowedMinutes = useMemo(
    () => calculateMockTimeAllowedMinutes(questionCount, definition.timerPerQuestionSeconds),
    [definition.timerPerQuestionSeconds, questionCount]
  )
  const lessThanRecommended = questionCount < 20
  const canStart = Boolean(config?.canStart)
  const isComingSoon = Boolean(config?.comingSoon)

  const handleAdjustQuestions = (delta: number) => {
    setQuestionCount((previous) => clampMockQuestionCount(definition, previous + delta))
  }

  const handleStart = async () => {
    if (!canStart || isComingSoon) return

    try {
      setIsStarting(true)
      setWarningMessage(null)
      const response = await fetch(`/api/mock-tests/${definition.routeKey}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalQuestions: questionCount }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || `Could not start ${definition.testName}.`)
      }

      if (data.warning) {
        setWarningMessage(String(data.warning))
      }

      router.push(`/practice/${definition.routeKey}/test?sessionId=${encodeURIComponent(data.sessionId)}`)
    } catch (error: any) {
      toast({
        title: 'Unable to start test',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleNotify = async () => {
    try {
      setNotifyLoading(true)
      const response = await fetch(`/api/mock-tests/${definition.routeKey}/notify`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Could not save your notification preference.')
      }
      toast({
        title: 'Noted',
        description: data.message || "We'll notify you when this mode becomes available.",
      })
    } catch (error: any) {
      toast({
        title: 'Unable to save preference',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setNotifyLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={32} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="pt-24 px-4">
          <Card className="max-w-xl mx-auto rounded-2xl border border-slate-200">
            <CardContent className="p-8 text-center space-y-4">
              <h1 className="text-2xl font-bold text-slate-900">Login required</h1>
              <p className="text-slate-600">Please log in to start this mock test.</p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => router.push('/auth/login')}>Log In</Button>
                <Button variant="outline" onClick={() => router.push('/auth/signup')}>
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <Card className="mx-auto max-w-[600px] rounded-3xl border border-slate-200 shadow-sm">
          <CardContent className="p-6 md:p-8">
            {isLoadingConfig ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-primary-green" size={30} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div
                    className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-lg"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${definition.gradientFrom}, ${definition.gradientTo})`,
                    }}
                  >
                    <HeaderIcon size={36} />
                  </div>
                  <span
                    className="mt-4 inline-flex rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{
                      border: `1px solid ${definition.subjects[0].lightBorder}`,
                      background: definition.subjects[0].lightBg,
                      color: definition.subjects[0].accentColor,
                    }}
                  >
                    {definition.badgeText}
                  </span>
                  <h1 className="mt-4 text-3xl font-black text-slate-900">{definition.testName}</h1>
                  <p className="mt-1 text-sm text-slate-500">{definition.fullName}</p>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: `1px solid ${definition.subjects[0].lightBorder}`,
                    background: definition.subjects[0].lightBg,
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: definition.subjects[0].accentColor }}>
                    {definition.infoTitle}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: definition.subjects[0].accentColor, opacity: 0.9 }}>
                    {definition.infoDescription}
                  </p>
                </div>

                {definition.isCombined ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Question Mix</p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[40%] float-left" style={{ background: definition.subjects[0].accentColor }} />
                      <div className="h-full w-[60%] float-left" style={{ background: definition.subjects[1].accentColor }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                      <span style={{ color: definition.subjects[0].accentColor }}>{definition.subjects[0].name}</span>
                      <span style={{ color: definition.subjects[1].accentColor }}>{definition.subjects[1].name}</span>
                    </div>
                    <p className="mt-1 text-center text-[11px] italic text-slate-400">
                      Exact ratio randomizes each attempt - just like real ICAP.
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div
                      className="rounded-full px-5 py-2 text-sm font-semibold"
                      style={{
                        background: definition.subjects[0].lightBg,
                        border: `1px solid ${definition.subjects[0].lightBorder}`,
                        color: definition.subjects[0].accentColor,
                      }}
                    >
                      {definition.subjects[0].code} — {definition.subjects[0].name}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Number of Questions</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => handleAdjustQuestions(-definition.questionStep)}
                    >
                      <Minus size={16} />
                    </Button>
                    <div className="min-w-[96px] rounded-xl border border-slate-200 bg-white px-5 py-2 text-center text-xl font-black text-slate-900">
                      {questionCount}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => handleAdjustQuestions(definition.questionStep)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  <p className="text-center text-xs text-slate-400">
                    Default: {definition.defaultQuestions} questions
                  </p>
                </div>

                <div className="rounded-xl border border-[#fcd34d] bg-[#fef9c3] px-4 py-3 text-sm font-semibold text-[#854d0e]">
                  Time Allowed: {timeAllowedMinutes} minutes
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">Exam Rules</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                    {definition.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>

                {config?.availability ? (
                  <p className="text-xs text-slate-500 text-center">
                    {definition.subjects.map((subject) => {
                      const found = config.availability.bySubject.find((item) => item.code === subject.code)
                      return `${subject.code}: ${found?.count || 0}`
                    }).join(' · ')}
                  </p>
                ) : null}

                {lessThanRecommended ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    We recommend at least 20 questions for a meaningful mock test.
                  </div>
                ) : null}

                {warningMessage ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                    {warningMessage}
                  </div>
                ) : null}

                {!canStart ? (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      isComingSoon
                        ? 'border border-amber-300 bg-amber-50 text-amber-800'
                        : 'border border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {config?.errorMessage || `Cannot start ${definition.testName} right now.`}
                  </div>
                ) : null}

                {isComingSoon && definition.comingSoonMessage ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl py-6 text-base font-bold"
                    style={{
                      borderColor: definition.subjects[0].lightBorder,
                      color: definition.subjects[0].accentColor,
                    }}
                    onClick={() => void handleNotify()}
                    disabled={notifyLoading}
                  >
                    {notifyLoading ? 'Saving...' : definition.comingSoonMessage.ctaLabel}
                  </Button>
                ) : (
                  <Button
                    className="w-full rounded-2xl py-6 text-base font-bold text-white shadow-sm hover:brightness-110 hover:-translate-y-0.5 transition-all"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${definition.gradientFrom}, ${definition.gradientTo})`,
                    }}
                    onClick={() => void handleStart()}
                    disabled={!canStart || isStarting}
                  >
                    {isStarting ? 'Starting...' : `Start ${definition.testName}`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
