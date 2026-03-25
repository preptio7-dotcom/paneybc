'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { TimerModal } from '@/components/financial-statements/TimerModal'
import { CountdownTimer } from '@/components/financial-statements/CountdownTimer'
import { PdfViewer } from '@/components/financial-statements/PdfViewer'
import { SociTable } from '@/components/financial-statements/SociTable'
import { SofpTable } from '@/components/financial-statements/SofpTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function FinancialStatementsPracticePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<any>(null)
  const [showTimerModal, setShowTimerModal] = useState(true)
  const [timeLimit, setTimeLimit] = useState(45)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitGuard = useRef(false)

  const [sociAnswers, setSociAnswers] = useState<Array<{ line_item_id: number; selected_value: string }>>([])
  const [sofpAnswers, setSofpAnswers] = useState<Array<{ line_item_id: number; selected_value: string }>>([])

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/financial-statements/cases/${caseId}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load case')
        setCaseData(data.case)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load case.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!loading) {
      load()
    }
  }, [caseId, loading, toast])

  const handleStart = async (selectedTime: number) => {
    try {
      setTimeLimit(selectedTime)
      setShowTimerModal(false)
      setStartTime(Date.now())

      const response = await fetch('/api/financial-statements/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, timeLimit: selectedTime }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to start attempt')
      setAttemptId(data.attemptId)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start practice.',
        variant: 'destructive',
      })
      setShowTimerModal(true)
    }
  }

  const handleSubmit = async () => {
    if (submitGuard.current || isSubmitting) return
    submitGuard.current = true
    setIsSubmitting(true)
    try {
      if (!attemptId || !startTime) throw new Error('Attempt not started')
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      const response = await fetch('/api/financial-statements/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          caseId,
          sociAnswers,
          sofpAnswers,
          timeSpent,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit attempt')
      router.push(`/financial-statements/results/${attemptId}`)
    } catch (error: any) {
      submitGuard.current = false
      setIsSubmitting(false)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit attempt.',
        variant: 'destructive',
      })
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
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

  if (!caseData) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <p className="text-text-light">Case not found.</p>
      </div>
    )
  }

  const totalItems = (caseData.sociLineItems?.length || 0) + (caseData.sofpLineItems?.length || 0)
  const answeredCount = new Set([
    ...sociAnswers.map((a) => a.line_item_id),
    ...sofpAnswers.map((a) => a.line_item_id),
  ]).size

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <main className="pt-[90px] pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {showTimerModal && (
            <TimerModal defaultTime={caseData.defaultTimeLimit || 45} onStart={handleStart} />
          )}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{caseData.caseNumber}</p>
              <h1 className="font-heading text-2xl font-bold text-text-dark">{caseData.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {attemptId ? (
                <CountdownTimer timeLimit={timeLimit * 60} onTimeout={handleSubmit} />
              ) : (
                <div className="text-sm text-text-light">Timer starts after you set the time limit.</div>
              )}
              <Button onClick={handleSubmit} disabled={isSubmitting || !attemptId} className="gap-2">
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-text-dark">Trial Balance</h3>
              <PdfViewer url={caseData.trialBalancePdfUrl} />
              {caseData.additionalInfo && (
                <Card className="border-border bg-white">
                  <CardContent className="p-4 text-sm text-text-light">
                    <p className="font-semibold text-text-dark mb-1">Additional Information</p>
                    {caseData.additionalInfo}
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="space-y-4">
              <div className="h-[460px] md:h-[620px] xl:h-[760px] overflow-y-auto pr-2 space-y-6">
                <div className="space-y-3">
                  {caseData.showThousandsNote && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <span className="font-semibold">Rs. 000:</span> Enter values in thousands.
                      <span className="ml-2">Example: 100,000 should be entered as 100.</span>
                    </div>
                  )}
                  <h3 className="font-semibold text-text-dark">Statement of Comprehensive Income (SOCI)</h3>
                  <SociTable
                    lineItems={caseData.sociLineItems || []}
                    answers={sociAnswers}
                    onAnswerChange={setSociAnswers}
                    caseId={caseData.id}
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-dark">Statement of Financial Position (SOFP)</h3>
                  <SofpTable
                    lineItems={caseData.sofpLineItems || []}
                    answers={sofpAnswers}
                    onAnswerChange={setSofpAnswers}
                    caseId={caseData.id}
                  />
                </div>
              </div>
            </div>
          </div>

          <Card className="border-border bg-white">
            <CardContent className="p-4 text-sm text-text-light flex items-center justify-between">
              <span>Progress: {answeredCount} / {totalItems} items</span>
              <span>Total marks: {caseData.totalMarks || 20}</span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
