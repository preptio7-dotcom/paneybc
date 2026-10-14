'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { CaseCard } from '@/components/financial-statements/CaseCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'

interface CaseSummary {
  id: number
  caseNumber: string
  title: string
  defaultTimeLimit: number
  totalMarks: number
  questionCount?: number
}

export default function FinancialStatementsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [summary, setSummary] = useState<{
    totalCases: number
    totalQuestions: number
    totalAttempts: number
    completedCases: number
    averageScore: number
    bestScore: number
  } | null>(null)

  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(cases.length / pageSize))
  const startIndex = (page - 1) * pageSize
  const pageCases = cases.slice(startIndex, startIndex + pageSize)
  const progressPercent = summary
    ? Math.round((summary.totalCases ? (summary.completedCases / summary.totalCases) * 100 : 0))
    : 0

  useEffect(() => {
    const loadCases = async () => {
      try {
        const response = await fetch('/api/financial-statements/cases')
        const data = await response.json()
        setCases(data.cases || [])
      } catch (error) {
        setCases([])
      } finally {
        setIsLoading(false)
      }
    }
    if (!loading) {
      loadCases()
    }
  }, [loading])

  useEffect(() => {
    const loadSummary = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/financial-statements/summary')
        const data = await response.json()
        if (response.ok) {
          setSummary(data)
        }
      } catch (error) {
        setSummary(null)
      }
    }

    if (!loading) {
      loadSummary()
    }
  }, [loading, user])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  if (loading) {
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

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <main className="pt-[90px] pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">Financial Statements Practice</h1>
              <p className="text-text-light">
                Solve trial balance cases with SOCI & SOFP dropdown selections.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/financial-statements/my-attempts')}>
              View My Attempts
            </Button>
          </div>

          {summary && (
            <Card className="border-border bg-white">
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-slate-400">Attempts & score</p>
                    <p className="text-text-dark">
                      {summary.totalAttempts} attempts · Avg {summary.averageScore}% · Best {summary.bestScore}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Questions available</p>
                    <p className="font-semibold text-text-dark">{summary.totalQuestions} questions</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Cases completed</p>
                    <p className="font-semibold text-text-dark">
                      {summary.completedCases}/{summary.totalCases}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-text-dark">Your Progress:</p>
                    <p className="text-sm font-bold text-primary-green">{progressPercent}%</p>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <p className="text-xs text-text-light">
                    {summary.completedCases}/{summary.totalCases} cases completed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary-green" size={32} />
            </div>
          ) : cases.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center text-text-light">
                No cases available right now. Please check back later.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {pageCases.map((item) => (
                  <CaseCard
                    key={item.id}
                    caseNumber={item.caseNumber}
                    title={item.title}
                    timeLimit={item.defaultTimeLimit}
                    totalMarks={item.totalMarks}
                    questionCount={item.questionCount}
                    onStart={() => router.push(`/financial-statements/practice/${item.id}`)}
                  />
                ))}
              </div>
              {cases.length > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-text-light">
                  <span>
                    Showing {cases.length ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, cases.length)} of {cases.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      Prev
                    </Button>
                    <span>Page {page} of {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
