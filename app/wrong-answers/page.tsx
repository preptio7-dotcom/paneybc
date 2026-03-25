'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

export default function WrongAnswersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [subjects, setSubjects] = useState<{ subject: string; count: number }[]>([])

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      try {
        setIsLoading(true)
        const response = await fetch(`/api/wrong-answers/summary?userId=${user.id}`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load wrong answers')
        }
        setSubjects(data.subjects || [])
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load wrong answers.',
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
  }, [authLoading, user?.id, toast])

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
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">Practice Wrong Answers</h1>
            <p className="text-text-light">Pick a subject to retry the questions you answered incorrectly.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary-green" size={32} />
            </div>
          ) : subjects.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center space-y-3">
                <AlertCircle className="mx-auto text-slate-400" size={44} />
                <p className="text-text-dark font-semibold">No wrong answers found yet.</p>
                <p className="text-text-light text-sm">Finish any test and your incorrect questions will appear here immediately.</p>
                <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((item) => (
                <Card key={item.subject} className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.subject}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-text-light">Wrong answers: {item.count}</p>
                    <Button onClick={() => router.push(`/wrong-answers/test?subject=${encodeURIComponent(item.subject)}`)}>
                      Start Practice
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
