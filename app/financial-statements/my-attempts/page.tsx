'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { AttemptHistoryTable } from '@/components/financial-statements/AttemptHistoryTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function FinancialStatementAttemptsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [attempts, setAttempts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/financial-statements/my-attempts')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load attempts')
        setAttempts(data.attempts || [])
      } catch (error) {
        setAttempts([])
      } finally {
        setIsLoading(false)
      }
    }
    if (!loading) {
      load()
    }
  }, [loading])

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
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">My Attempts</h1>
              <p className="text-text-light">Review your financial statement practice history.</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/financial-statements')}>
              Back to Cases
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary-green" size={32} />
            </div>
          ) : attempts.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center text-text-light">
                No attempts yet. Start a case to see your history here.
              </CardContent>
            </Card>
          ) : (
            <AttemptHistoryTable
              attempts={attempts}
              onView={(id) => router.push(`/financial-statements/results/${id}`)}
            />
          )}
        </div>
      </main>
    </div>
  )
}
