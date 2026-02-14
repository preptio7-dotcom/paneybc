'use client'

import React, { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { WelcomeSection } from '@/components/welcome-section'
import { SubjectCard } from '@/components/subject-card'
import { RecentActivity } from '@/components/recent-activity'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { NotificationOptIn } from '@/components/notification-opt-in'
import { AdSlot } from '@/components/ad-slot'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface SubjectStat {
  code: string
  name: string
  totalQuestions: number
  easyQuestions: number
  mediumQuestions: number
  hardQuestions: number
  completedQuestions: number
  progressPercent: number
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [authToastShown, setAuthToastShown] = useState(false)
  const [subjects, setSubjects] = useState<SubjectStat[]>([])
  const [globalStats, setGlobalStats] = useState<any>(null)
  const [reviewDueCount, setReviewDueCount] = useState(0)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [adsLoaded, setAdsLoaded] = useState(false)
  const [adContent, setAdContent] = useState<any>({
    dashboard: {
      headline: 'Level up your CA prep with expert-led notes',
      body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
      cta: 'Explore resources',
      href: '#',
    },
  })
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [dailyQuestionGoal, setDailyQuestionGoal] = useState(0)
  const [checklist, setChecklist] = useState<{ label: string; done: boolean }[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)
  const [isResettingNotes, setIsResettingNotes] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'password' | 'otp' | 'confirm'>('password')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteToken, setDeleteToken] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showGoodbye, setShowGoodbye] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [fsSummary, setFsSummary] = useState<{
    totalCases: number
    totalQuestions: number
    totalAttempts: number
    completedCases: number
    averageScore: number
    bestScore: number
  } | null>(null)
  const fsProgressPercent = fsSummary
    ? Math.round((fsSummary.totalCases ? (fsSummary.completedCases / fsSummary.totalCases) * 100 : 0))
    : 0

  useEffect(() => {
    if (authLoading || !user?.id) return
    fetchDashboardData()
  }, [authLoading, user?.id])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to access your dashboard.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  useEffect(() => {
    if (!deleteOpen) {
      setDeleteStep('password')
      setDeletePassword('')
      setDeleteOtp('')
      setDeleteToken('')
      setResendCooldown(0)
    }
  }, [deleteOpen])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    const loadSettings = async () => {
      const fallbackAds = {
        dashboard: {
          headline: 'Level up your CA prep with expert-led notes',
          body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
          cta: 'Explore resources',
          href: '#',
        },
      }

      try {
        const response = await fetch('/api/public/settings')
        if (!response.ok) {
          setAdsEnabled(false)
          setAdContent(fallbackAds)
          return
        }
        const data = await response.json()
        setAdsEnabled(Boolean(data.adsEnabled))
        setAdContent(data.adContent || fallbackAds)
      } catch (error) {
        console.error('Failed to load settings:', error)
        setAdsEnabled(false)
        setAdContent(fallbackAds)
      } finally {
        setAdsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  const defaultChecklist = [
    { label: 'Practiced 50+ questions per subject', done: false },
    { label: 'Completed 3 full mock exams', done: false },
    { label: 'Reviewed all weak areas', done: false },
    { label: 'Read past examiner reports', done: false },
    { label: 'Memorized key formulas', done: false },
    { label: 'Practiced time management', done: false },
    { label: "Reviewed last year's paper", done: false },
  ]

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // 1. Fetch real subjects first
      const subResponse = await fetch('/api/admin/subjects')
      const subData = await subResponse.json()
      const dbSubjects = subData.subjects || []

      // 2. Fetch stats
      if (!user?.id) return

      const statsResponse = await fetch(`/api/dashboard/stats?userId=${user.id}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        const statsMap = new Map<string, any>(statsData.stats.map((s: any) => [s.code, s]))
        setGlobalStats(statsData.globalStats)

        // 3. Merge subjects with stats and real counts
        const updatedSubjects = dbSubjects.map((sub: any) => {
          const stats = statsMap.get(sub.code) || {}
          const diffCounts = stats.difficultyCounts || { total: 0, easy: 0, medium: 0, hard: 0 }

          return {
            name: sub.name,
            code: sub.code,
            totalQuestions: diffCounts.total || 0,
            easyQuestions: diffCounts.easy || 0,
            mediumQuestions: diffCounts.medium || 0,
            hardQuestions: diffCounts.hard || 0,
            completedQuestions: stats.completedQuestions || 0,
            progressPercent: stats.progressPercent || 0
          }
        })

        setSubjects(updatedSubjects)
      }

      const reviewResponse = await fetch('/api/review/due?countOnly=1')
      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json()
        setReviewDueCount(reviewData.count || 0)
      }

      const profileResponse = await fetch('/api/user/profile')
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        const userProfile = profileData.user || {}
        setExamName(userProfile.examName || '')
        setExamDate(userProfile.examDate ? new Date(userProfile.examDate).toISOString().slice(0, 10) : '')
        setDailyQuestionGoal(userProfile.dailyQuestionGoal || 0)
        setChecklist(userProfile.prepChecklist?.length ? userProfile.prepChecklist : defaultChecklist)
      }

      const fsResponse = await fetch('/api/financial-statements/summary')
      if (fsResponse.ok) {
        const fsData = await fsResponse.json()
        setFsSummary(fsData)
      } else {
        setFsSummary(null)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePlan = async () => {
    try {
      setIsSavingPlan(true)
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName,
          examDate,
          dailyQuestionGoal,
          prepChecklist: checklist,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save plan', error)
    } finally {
      setIsSavingPlan(false)
    }
  }

  const handleAddChecklistItem = () => {
    const value = newChecklistItem.trim()
    if (!value) return
    setChecklist((prev) => [...prev, { label: value, done: false }])
    setNewChecklistItem('')
  }

  const handleResetProgress = async () => {
    try {
      setIsResetting(true)
      const response = await fetch('/api/user/reset-progress', {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset progress')
      }
      toast({
        title: 'Progress reset',
        description: 'Your progress has been cleared.',
      })
      await fetchDashboardData()
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Unable to reset progress.',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleResetNotes = async () => {
    try {
      setIsResettingNotes(true)
      const response = await fetch('/api/user/reset-notes', {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset notes')
      }
      toast({
        title: 'Notes cleared',
        description: 'Your notes and flashcards have been deleted.',
      })
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Unable to reset notes.',
        variant: 'destructive',
      })
    } finally {
      setIsResettingNotes(false)
    }
  }

  const handleDeleteRequest = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to verify password')
      setDeleteStep('otp')
      toast({ title: 'Verification code sent', description: 'Check your email for the deletion code.' })
    } catch (error: any) {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleVerifyDeleteCode = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: deleteOtp }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invalid code')
      setDeleteToken(data.confirmToken)
      setDeleteStep('confirm')
    } catch (error: any) {
      toast({ title: 'Invalid code', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResendDeleteCode = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/request', {
        method: 'PUT',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to resend code')
      setResendCooldown(60)
      toast({ title: 'Code resent', description: 'A new verification code has been sent to your email.' })
    } catch (error: any) {
      toast({ title: 'Resend failed', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmToken: deleteToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete account')
      setDeleteOpen(false)
      setShowGoodbye(true)
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (error) {
        // ignore storage errors
      }
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const countdown = () => {
    if (!examDate) return null
    const today = new Date()
    const target = new Date(examDate)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const countdownDays = countdown()
  const countdownColor = countdownDays === null
    ? 'text-text-light'
    : countdownDays > 60
      ? 'text-emerald-600'
      : countdownDays > 30
        ? 'text-amber-600'
        : 'text-rose-600'

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
            <p className="text-text-light text-sm">Please log in to access your dashboard.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.assign('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => window.location.assign('/')}>Back to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background-light">
      <Navigation />

      <div className="pt-[70px] pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {adsLoaded && adsEnabled && adContent?.dashboard && (
            <div className="pt-8 mb-8">
              <AdSlot
                placement="dashboard"
                headline={adContent.dashboard.headline}
                body={adContent.dashboard.body}
                cta={adContent.dashboard.cta}
                href={adContent.dashboard.href}
              />
            </div>
          )}
          {/* Welcome Section */}
          <div className="pt-8 mb-12">
            <WelcomeSection statsData={globalStats} reviewDueCount={reviewDueCount} />
          </div>

          {reviewDueCount > 0 && (
            <Card className="border border-border mb-12 bg-white">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-heading text-xl font-bold text-text-dark">
                    Review Due: {reviewDueCount} questions
                  </h3>
                  <p className="text-text-light">
                    Strengthen memory with your spaced repetition queue.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <Button onClick={() => window.location.assign('/review')}>
                    Start Review
                  </Button>
                  <NotificationOptIn />
                </div>
              </CardContent>
            </Card>
          )}

          <div id="account-data" className="mb-12 space-y-4 scroll-mt-24">
            <h3 className="font-heading text-2xl font-bold text-text-dark">Account & Data</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border border-border bg-white">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-dark">
                      Reset Progress
                    </h3>
                    <p className="text-text-light">
                      This will clear your test history, weak-area data, and review progress.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isResetting}>
                          {isResetting ? 'Resetting...' : 'Reset Progress'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-error-red">
                            Reset all progress?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your test results, review queue, and study sessions.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetProgress}>
                            Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={isResettingNotes}>
                          {isResettingNotes ? 'Clearing...' : 'Clear Notes & Flashcards'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-error-red">
                            Delete notes and flashcards?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all your notes and flashcards.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetNotes}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-white">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-dark">
                      Delete Account
                    </h3>
                    <p className="text-text-light">
                      Permanently delete your account and all associated data.
                    </p>
                  </div>
                  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete Account</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      {deleteStep === 'password' && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-error-red">Confirm your password</DialogTitle>
                            <DialogDescription>
                              Enter your password to request a deletion verification code.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <Input
                              type="password"
                              placeholder="Password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDeleteRequest} disabled={isDeleting || !deletePassword}>
                              {isDeleting ? 'Verifying...' : 'Send Code'}
                            </Button>
                          </DialogFooter>
                        </>
                      )}

                      {deleteStep === 'otp' && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-error-red">Verify deletion code</DialogTitle>
                            <DialogDescription>
                              Enter the 6-digit code sent to your email.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <Input
                              placeholder="Verification code"
                              value={deleteOtp}
                              onChange={(e) => setDeleteOtp(e.target.value)}
                            />
                            <div className="text-xs text-slate-500">
                              {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Didn’t receive the code?'}
                            </div>
                          </div>
                          <DialogFooter>
                            <div className="flex flex-wrap gap-2 items-center">
                              <Button variant="outline" onClick={() => setDeleteStep('password')}>Back</Button>
                              <Button
                                variant="outline"
                                disabled={resendCooldown > 0 || isDeleting}
                                onClick={handleResendDeleteCode}
                              >
                                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                              </Button>
                            </div>
                            <Button variant="destructive" onClick={handleVerifyDeleteCode} disabled={isDeleting || !deleteOtp}>
                              {isDeleting ? 'Verifying...' : 'Verify'}
                            </Button>
                          </DialogFooter>
                        </>
                      )}

                      {deleteStep === 'confirm' && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-error-red">Final confirmation</DialogTitle>
                            <DialogDescription>
                              This action is permanent. Are you absolutely sure you want to delete your account?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                              {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="practice-modes" className="mb-12 space-y-4 scroll-mt-24">
            <h3 className="font-heading text-2xl font-bold text-text-dark">Practice Modes</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border border-border bg-white">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-dark">
                      Weak Area Intensive Mode
                    </h3>
                    <p className="text-text-light">
                      Focus on your 3 weakest chapters and improve to 75% accuracy.
                    </p>
                  </div>
                  <Button onClick={() => window.location.assign('/weak-area')}>
                    Start Intensive
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border bg-white">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-dark">
                      Practice Wrong Answers
                    </h3>
                    <p className="text-text-light">
                      Retry the questions you answered incorrectly, subject by subject.
                    </p>
                  </div>
                  <Button onClick={() => window.location.assign('/wrong-answers')}>
                    Start Practice
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border bg-white">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-dark">
                      Financial Statements Practice
                    </h3>
                    <p className="text-text-light">
                      Trial balance cases with SOCI & SOFP dropdown selections.
                    </p>
                    {fsSummary ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-text-dark">Your Progress:</p>
                          <p className="text-sm font-bold text-primary-green">{fsProgressPercent}%</p>
                        </div>
                        <Progress value={fsProgressPercent} className="h-3" />
                        <p className="text-xs text-text-light">
                          {fsSummary.completedCases}/{fsSummary.totalCases} cases completed ·
                          {' '}Questions: {fsSummary.totalQuestions}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-text-light mt-2">Loading progress...</p>
                    )}
                  </div>
                  <Button onClick={() => window.location.assign('/financial-statements')}>
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card id="study-tools" className="border border-border mb-12 bg-white scroll-mt-24">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-text-dark">
                  Study Tools
                </h3>
                <p className="text-text-light">Pomodoro, notes, planner, and analytics.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.location.assign('/study-session')}>
                  Study Session
                </Button>
                <Button variant="outline" onClick={() => window.location.assign('/notes')}>
                  Notes & Flashcards
                </Button>
                <Button variant="outline" onClick={() => window.location.assign('/study-planner')}>
                  Study Planner
                </Button>
                <Button variant="outline" onClick={() => window.location.assign('/analytics')}>
                  Analytics
                </Button>
                <Button onClick={() => window.location.assign('/exam-simulator')}>
                  Exam Simulator
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subjects Section */}
          <div id="subjects" className="mb-12 scroll-mt-24">
            <h3 className="font-heading text-2xl font-bold text-text-dark mb-6">
              Your Subjects
            </h3>
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => window.location.assign('/custom-quiz')}
              >
                Build Custom Quiz
              </Button>
            </div>
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-primary-green" size={40} />
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-border">
                <p className="text-text-light">No subjects found. Please contact an admin to add subjects.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject, index) => (
                  <SubjectCard key={index} {...subject} />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            <Card id="exam-countdown" className="border border-border bg-white scroll-mt-24">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-heading text-xl font-bold text-text-dark">Exam Countdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="examName">Exam Name</Label>
                    <Input
                      id="examName"
                      placeholder="e.g. CAF Exam"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examDate">Exam Date</Label>
                    <Input
                      id="examDate"
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Days Remaining</p>
                    <p className={`text-2xl font-black ${countdownColor}`}>
                      {countdownDays === null ? '--' : countdownDays}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Daily Target</p>
                    <Input
                      type="number"
                      min="0"
                      value={dailyQuestionGoal}
                      onChange={(e) => setDailyQuestionGoal(Number(e.target.value) || 0)}
                      className="w-24 text-right"
                    />
                  </div>
                </div>
                <Button onClick={handleSavePlan} disabled={isSavingPlan}>
                  {isSavingPlan ? 'Saving...' : 'Save Plan'}
                </Button>
              </CardContent>
            </Card>

            <Card id="pre-exam-checklist" className="border border-border bg-white scroll-mt-24">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-heading text-xl font-bold text-text-dark">Pre-Exam Checklist</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Add your own checklist item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                  />
                  <Button type="button" onClick={handleAddChecklistItem} className="gap-2">
                    <Plus size={16} />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-text-dark">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) => {
                          const next = [...checklist]
                          next[idx] = { ...item, done: e.target.checked }
                          setChecklist(next)
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      <Input
                        value={item.label}
                        onChange={(e) => {
                          const next = [...checklist]
                          next[idx] = { ...item, label: e.target.value }
                          setChecklist(next)
                        }}
                        className={item.done ? 'line-through text-text-light' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChecklist((prev) => prev.filter((_, i) => i !== idx))
                        }}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={handleSavePlan} disabled={isSavingPlan}>
                  {isSavingPlan ? 'Saving...' : 'Save Checklist'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setChecklist(defaultChecklist)}
                  className="text-text-light"
                >
                  Reset to Default
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Section */}
          <div id="performance-tracking" className="scroll-mt-24">
            <h3 className="font-heading text-2xl font-bold text-text-dark mb-6">
              Performance Tracking
            </h3>
            <RecentActivity />
          </div>
        </div>
      </div>
      {showGoodbye && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center px-6">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-4">
            <div className="text-6xl">😢</div>
            <h2 className="text-3xl font-black text-slate-800">We are sad to see you go</h2>
            <p className="text-slate-600">
              Your account has been deleted. If you ever want to come back, we'll be here.
            </p>
            <Button onClick={() => window.location.assign('/')}>Go to Home</Button>
          </div>
        </div>
      )}
    </main>
  )
}
