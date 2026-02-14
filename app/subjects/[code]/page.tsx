'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth-context'

interface Chapter {
  name: string
  code: string
  order: number
  questionCount?: number
}

interface SubjectDetail {
  name: string
  code: string
  description?: string
  chapters?: Chapter[]
}

interface TestSettings {
  fullBookTimeMinutes: number
  chapterTestDefaultMinutes: number
  chapterTestDefaultQuestions: number
}

export default function SubjectDetailPage() {
  const router = useRouter()
  const { code } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [subject, setSubject] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<'full' | 'chapter' | null>(null)
  const [testSettings, setTestSettings] = useState<TestSettings>({
    fullBookTimeMinutes: 120,
    chapterTestDefaultMinutes: 30,
    chapterTestDefaultQuestions: 25,
  })
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [chapterMinutes, setChapterMinutes] = useState(30)
  const [chapterQuestions, setChapterQuestions] = useState(25)
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false)
  const [practiceDifficulty, setPracticeDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed')
  const [practiceChapter, setPracticeChapter] = useState<Chapter | null>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [authPromptContext, setAuthPromptContext] = useState<'test' | 'practice' | null>(null)

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/subjects/${encodeURIComponent(String(code || ''))}`)
        const data = await response.json()
        if (response.ok) {
          setSubject(data.subject)
        } else {
          setSubject(null)
        }
      } catch (error) {
        setSubject(null)
      } finally {
        setIsLoading(false)
      }
    }

    if (code) {
      fetchSubject()
    }
  }, [code])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/public/settings')
        if (!response.ok) return
        const data = await response.json()
        if (data.testSettings) {
          setTestSettings({
            fullBookTimeMinutes: Number(data.testSettings.fullBookTimeMinutes) || 120,
            chapterTestDefaultMinutes: Number(data.testSettings.chapterTestDefaultMinutes) || 30,
            chapterTestDefaultQuestions: Number(data.testSettings.chapterTestDefaultQuestions) || 25,
          })
        }
      } catch (error) {
        // ignore settings errors
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const initialMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mode') : null
    if (initialMode === 'chapter') {
      setMode('chapter')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">Subject not found.</p>
            <Button onClick={() => router.push('/subjects')}>Back to Subjects</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const chapters = (subject.chapters || []).sort((a, b) => (a.order || 0) - (b.order || 0))
  const fullBookTime = testSettings.fullBookTimeMinutes || 120

  const openChapterDialog = (chapter: Chapter) => {
    setSelectedChapter(chapter)
    setChapterMinutes(testSettings.chapterTestDefaultMinutes || 30)
    setChapterQuestions(testSettings.chapterTestDefaultQuestions || 25)
    setChapterDialogOpen(true)
  }

  const openPracticeDialog = (chapter: Chapter) => {
    setPracticeChapter(chapter)
    setPracticeDifficulty('mixed')
    setPracticeDialogOpen(true)
  }

  const openAuthPrompt = (context?: 'test' | 'practice') => {
    setAuthPromptContext(context || null)
    setAuthPromptOpen(true)
  }

  const startChapterTest = () => {
    if (!selectedChapter) return
    if (authLoading) return
    if (!user) {
      setChapterDialogOpen(false)
      openAuthPrompt('test')
      return
    }
    const minutes = Math.max(5, Math.min(240, Number(chapterMinutes) || 30))
    const questions = Math.max(5, Math.min(200, Number(chapterQuestions) || 25))
    router.push(
      `/subjects/${encodeURIComponent(subject.code)}/test?mode=chapter&chapter=${encodeURIComponent(selectedChapter.code)}&time=${minutes}&limit=${questions}`
    )
  }

  const startChapterPractice = () => {
    if (!practiceChapter) return
    if (authLoading) return
    if (!user) {
      setPracticeDialogOpen(false)
      openAuthPrompt('practice')
      return
    }
    router.push(
      `/subjects/${encodeURIComponent(subject.code)}/practice?chapter=${encodeURIComponent(practiceChapter.code)}&difficulty=${practiceDifficulty}`
    )
  }


  return (
    <main className="min-h-screen bg-background-light">
      <Navigation />

      <div className="pt-20 md:pt-28 pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push('/subjects')}>
              <ArrowLeft size={16} />
              Back to Subjects
            </Button>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary-green/10 text-primary-green px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
              <BookOpen size={16} />
              {subject.code}
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-black text-text-dark">
              {subject.name}
            </h1>
            <p className="text-text-light max-w-2xl">
              {subject.description || 'Choose how you want to practice this subject.'}
            </p>
          </div>

          {!mode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <h3 className="text-xl font-bold text-text-dark">Full Book Test</h3>
                  <p className="text-text-light text-sm">
                    All chapters mixed and shuffled for sharp practice. Default time: {fullBookTime} minutes.
                  </p>
                  <Button
                    className="w-full bg-[#0F7938] hover:bg-[#0F7938]/90"
                    disabled={authLoading}
                    onClick={() => {
                      if (authLoading) return
                      if (!user) {
                        openAuthPrompt('test')
                        return
                      }
                      router.push(`/subjects/${encodeURIComponent(subject.code)}/test?mode=full&time=${fullBookTime}`)
                    }}
                  >
                    Start Full Book Test
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <h3 className="text-xl font-bold text-text-dark">Chapter Wise Test</h3>
                  <p className="text-text-light text-sm">
                    Focus practice on a specific chapter.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setMode('chapter')}
                  >
                    Choose Chapter
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {mode === 'chapter' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl font-bold text-text-dark">Select a Chapter</h2>
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Back
                </Button>
              </div>

              {chapters.length === 0 ? (
                <Card className="border border-border">
                  <CardContent className="p-8 text-center space-y-3">
                    <p className="text-text-dark font-semibold">No chapters added yet.</p>
                    <p className="text-text-light text-sm">Ask an admin to add chapter data.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chapters.map((chapter) => (
                    <Card key={chapter.code} className="border border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-6 space-y-3">
                        <div className="text-xs font-bold text-primary-green">{chapter.code}</div>
                        <h3 className="text-lg font-semibold text-text-dark">{chapter.name}</h3>
                        <p className="text-xs text-text-light">
                          {chapter.questionCount || 0} questions
                        </p>
                        <div className="flex flex-col gap-2">
                          <Button
                            className="w-full"
                            onClick={() => openChapterDialog(chapter)}
                          >
                            Start Chapter Test
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => openPracticeDialog(chapter)}
                          >
                            Practice This Chapter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Chapter Test Setup</DialogTitle>
            <DialogDescription>
              Choose your time limit and number of questions for {selectedChapter?.name || 'this chapter'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Time (minutes)</label>
              <Input
                type="number"
                min="5"
                max="240"
                value={chapterMinutes}
                onChange={(e) => setChapterMinutes(Number(e.target.value) || 30)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Total Questions</label>
              <Input
                type="number"
                min="5"
                max="200"
                value={chapterQuestions}
                onChange={(e) => setChapterQuestions(Number(e.target.value) || 25)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChapterDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#0F7938] hover:bg-[#0F7938]/90" onClick={startChapterTest} disabled={authLoading}>
              Start Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={practiceDialogOpen} onOpenChange={setPracticeDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Practice Difficulty</DialogTitle>
            <DialogDescription>
              Choose a difficulty for {practiceChapter?.name || 'this chapter'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {(['mixed', 'easy', 'medium', 'hard'] as const).map((level) => (
              <Button
                key={level}
                type="button"
                variant={practiceDifficulty === level ? 'default' : 'outline'}
                className="capitalize"
                onClick={() => setPracticeDifficulty(level)}
              >
                {level === 'mixed' ? 'Mixed (All)' : level}
              </Button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPracticeDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#0F7938] hover:bg-[#0F7938]/90" onClick={startChapterPractice} disabled={authLoading}>
              Start Practice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={authPromptOpen}
        onOpenChange={(open) => {
          setAuthPromptOpen(open)
          if (!open) setAuthPromptContext(null)
        }}
      >
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Continue with a free account</DialogTitle>
            <DialogDescription>
              {authPromptContext === 'practice'
                ? 'Practice sessions are available for members. Create a free account or try a quick demo.'
                : 'Tests are available for members. Create a free account or try a quick demo first.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              className="bg-[#0F7938] hover:bg-[#0F7938]/90"
              onClick={() => {
                setAuthPromptOpen(false)
                router.push('/auth/signup')
              }}
            >
              Create Free Account
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAuthPromptOpen(false)
                router.push('/demo')
              }}
            >
              Try Demo
            </Button>
          </DialogFooter>
          <div className="text-center text-xs text-text-light">
            Already have an account?{' '}
            <button
              type="button"
              className="font-semibold text-primary-green hover:underline"
              onClick={() => {
                setAuthPromptOpen(false)
                router.push('/auth/login')
              }}
            >
              Log in
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  )
}
