'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'

interface Chapter {
  name: string
  code: string
  order: number
  questionCount?: number
}

interface Subject {
  id?: string
  _id?: string
  name: string
  code: string
  description?: string
  chapters?: Chapter[]
}

export default function CustomQuizPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [authToastShown, setAuthToastShown] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [questionCount, setQuestionCount] = useState(25)
  const [timeLimit, setTimeLimit] = useState(20)
  const [easyPercent, setEasyPercent] = useState(30)
  const [mediumPercent, setMediumPercent] = useState(50)
  const [hardPercent, setHardPercent] = useState(20)

  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(false)
      return
    }
    const loadSubjects = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/subjects')
        const data = await response.json()
        const list = data.subjects || []
        setSubjects(list)
        if (list.length > 0) {
          setSelectedSubject(list[0])
        }
      } catch (error) {
        setSubjects([])
      } finally {
        setIsLoading(false)
      }
    }

    loadSubjects()
  }, [authLoading, user])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to build a custom quiz.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  useEffect(() => {
    if (!selectedSubject) return
    setSelectedChapters([])
  }, [selectedSubject])

  const totalPercent = easyPercent + mediumPercent + hardPercent
  const percentHint = totalPercent === 100 ? 'Balanced' : `Adjust to 100% (now ${totalPercent}%)`

  const availableChapters = useMemo(() => {
    return (selectedSubject?.chapters || []).sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [selectedSubject])

  const toggleChapter = (code: string) => {
    setSelectedChapters((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const handleStart = () => {
    if (!selectedSubject) return
    const chaptersParam = selectedChapters.join(',')
    const params = new URLSearchParams({
      subject: selectedSubject.code,
      count: String(questionCount),
      time: String(timeLimit),
      easy: String(easyPercent),
      medium: String(mediumPercent),
      hard: String(hardPercent),
    })
    if (chaptersParam) {
      params.set('chapters', chaptersParam)
    }
    router.push(`/custom-test?${params.toString()}`)
  }

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
            <p className="text-text-light text-sm">Please log in to build a custom quiz.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background-light">
      <Navigation />

      <div className="pt-20 md:pt-28 pb-16">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl md:text-4xl font-black text-text-dark">
              Custom Quiz Builder
            </h1>
            <p className="text-text-light">
              Build a practice test with your preferred subject, chapters, and difficulty mix.
            </p>
          </div>

          <Card className="border border-border">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Step 1: Choose Subject</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjects.map((subject, idx) => (
                    <Button
                      key={subject.id ?? subject._id ?? `${subject.code ?? 'subject'}-${idx}`}
                      variant={selectedSubject?.code === subject.code ? 'default' : 'outline'}
                      className="justify-start text-left whitespace-normal break-words h-auto py-3 leading-snug"
                      onClick={() => setSelectedSubject(subject)}
                    >
                      {subject.name} ({subject.code})
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Step 2: Choose Chapters (optional)</Label>
                {availableChapters.length === 0 ? (
                  <p className="text-sm text-text-light">No chapters available for this subject.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableChapters.map((chapter) => (
                      <Button
                        key={chapter.code}
                        variant={selectedChapters.includes(chapter.code) ? 'default' : 'outline'}
                        className="justify-start text-left whitespace-normal break-words h-auto py-3 leading-snug"
                        onClick={() => toggleChapter(chapter.code)}
                      >
                        {chapter.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Step 3: Quiz Settings</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="questionCount">Total Questions</Label>
                    <Input
                      id="questionCount"
                      type="number"
                      min="5"
                      max="200"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value) || 25)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="5"
                      max="180"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value) || 20)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty Mix</Label>
                    <p className="text-xs text-text-light">{percentHint}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="easyPercent">Easy %</Label>
                    <Input
                      id="easyPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={easyPercent}
                      onChange={(e) => setEasyPercent(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mediumPercent">Medium %</Label>
                    <Input
                      id="mediumPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={mediumPercent}
                      onChange={(e) => setMediumPercent(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hardPercent">Hard %</Label>
                    <Input
                      id="hardPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={hardPercent}
                      onChange={(e) => setHardPercent(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-[#0F7938] hover:bg-[#0F7938]/90"
                onClick={handleStart}
              >
                Start Custom Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  )
}
