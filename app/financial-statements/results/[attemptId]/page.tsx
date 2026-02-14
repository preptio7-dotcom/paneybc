'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { ResultsCard } from '@/components/financial-statements/ResultsCard'
import { ReviewTable } from '@/components/financial-statements/ReviewTable'
import { PdfViewer } from '@/components/financial-statements/PdfViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function FinancialStatementResultsPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.attemptId as string
  const [attemptData, setAttemptData] = useState<any>(null)
  const [caseData, setCaseData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/financial-statements/results/${attemptId}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load results')
        setAttemptData(data.attempt)
        setCaseData(data.caseData)
      } catch (error) {
        setAttemptData(null)
        setCaseData(null)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [attemptId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!attemptData || !caseData) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <p className="text-text-dark font-semibold">Result not found</p>
            <Button onClick={() => router.push('/financial-statements')}>Back to Cases</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <main className="pt-[90px] pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{caseData.caseNumber}</p>
              <h1 className="font-heading text-2xl font-bold text-text-dark">{caseData.title} Results</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => router.push('/financial-statements/my-attempts')}>
                My Attempts
              </Button>
              <Button onClick={() => router.push(`/financial-statements/practice/${caseData.id}`)}>
                Try Again
              </Button>
            </div>
          </div>

          <ResultsCard
            totalMarks={attemptData.totalMarks || 20}
            obtainedMarks={attemptData.totalMarksObtained || 0}
            percentage={attemptData.percentageScore || 0}
            timeSpent={attemptData.timeSpent || 0}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-text-dark">Trial Balance</h3>
              <PdfViewer url={caseData.trialBalancePdfUrl} />
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-text-dark">SOCI Review</h3>
                <ReviewTable lineItems={caseData.sociLineItems || []} userAnswers={attemptData.sociAnswers || []} />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-text-dark">SOFP Review</h3>
                <ReviewTable lineItems={caseData.sofpLineItems || []} userAnswers={attemptData.sofpAnswers || []} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
