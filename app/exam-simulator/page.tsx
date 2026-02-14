'use client'

import React, { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface Subject {
  id?: string
  _id?: string
  name: string
  code: string
}

export default function ExamSimulatorPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [authToastShown, setAuthToastShown] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectCode, setSubjectCode] = useState('')
  const [duration, setDuration] = useState(120)
  const [questionCount, setQuestionCount] = useState(50)

  useEffect(() => {
    if (authLoading || !user) return
    const load = async () => {
      try {
        const settingsRes = await fetch('/api/public/settings')
        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (settings.testSettings?.fullBookTimeMinutes) {
            setDuration(Number(settings.testSettings.fullBookTimeMinutes) || 120)
          }
        }
      } catch (error) {
        // ignore
      }
      const response = await fetch('/api/admin/subjects')
      const data = await response.json()
      const list = data.subjects || []
      setSubjects(list)
      if (list.length > 0) setSubjectCode(list[0].code)
    }
    load()
  }, [authLoading, user])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to access the exam simulator.',
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
            <p className="text-text-light text-sm">Please log in to access the exam simulator.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleStart = () => {
    if (!subjectCode) return
    const encoded = encodeURIComponent(subjectCode)
    router.push(`/subjects/${encoded}/test?mode=full&time=${duration}&limit=${questionCount}&sim=1`)
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-4xl mx-auto space-y-6">
        <h1 className="font-heading text-3xl font-bold text-text-dark">Exam Day Simulator</h1>
        <Card className="border border-border">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subjects.map((subject, idx) => (
                  <Button
                    key={subject.id ?? subject._id ?? `${subject.code ?? 'subject'}-${idx}`}
                    variant={subject.code === subjectCode ? 'default' : 'outline'}
                    onClick={() => setSubjectCode(subject.code)}
                    className="justify-start text-left whitespace-normal break-words h-auto py-3 leading-snug"
                  >
                    {subject.name} ({subject.code})
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min="30" max="240" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 120)} />
              </div>
              <div className="space-y-2">
                <Label>Questions</Label>
                <Input type="number" min="10" max="100" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value) || 50)} />
              </div>
            </div>
            <Button onClick={handleStart}>Start Simulator</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
