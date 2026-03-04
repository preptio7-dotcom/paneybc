'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarDays,
  FileText,
  Flame,
  Layers,
  Loader2,
  Plus,
  Settings,
  Target,
  Trash2,
  Zap,
} from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { RecentActivity } from '@/components/recent-activity'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { NotificationOptIn } from '@/components/notification-opt-in'
import { AdSlot } from '@/components/ad-slot'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { betaFeatureDefinitions } from '@/data/beta-features'
import { canAccessBetaFeature, extractBetaFeatureSettings } from '@/lib/beta-features'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STREAK_BADGE_DEFINITIONS, type StreakBadgeType } from '@/lib/streak-badges'
import { getDateKeyInTimezone, getStreakResetLabel, type StreakResetTimezone } from '@/lib/streak-settings'
import { trackSubjectActionClick } from '@/lib/client-analytics'
import { PRACTICE_LABELS, SUBJECT_TEST_MODES } from '@/lib/practice-modes'
import { BAE_VOL1_CODE, BAE_VOL2_CODE, calculateBaeTimeAllowedMinutes } from '@/lib/bae-mock'

interface SubjectStat {
  code: string
  name: string
  totalQuestions: number
  easyQuestions: number
  mediumQuestions: number
  hardQuestions: number
  completedQuestions: number
  progressPercent: number
  testCount: number
  lastPracticedAt: string | null
}

interface StreakInfo {
  current: number
  best: number
  practicedToday: boolean
  lastPracticeDate: string | null
}

interface BadgeProgress {
  badgeType: StreakBadgeType
  name: string
  description: string
  icon: string
  colorClass: string
  milestoneDays: number
  earned: boolean
  earnedAt: string | null
  seen: boolean
}

interface BaeWeakAreaSummary {
  attemptCount: number
  unlocked: boolean
  remainingForUnlock: number
  accuracy: {
    vol1: number
    vol2: number
  }
  comparison: {
    difference: number
    weakerVolume: 'VOL1' | 'VOL2' | null
    strongerVolume: 'VOL1' | 'VOL2' | null
    balanced: boolean
  }
  history: Array<{
    id: string
    date: string
    scorePercent: number
    scoreText: string
    ratioText: string
    vol1Accuracy: number
    vol2Accuracy: number
    improvementDelta: number
    timeTaken: number
    timeAllowed: number
  }>
}

interface DashboardRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low'
  icon: string
  type: string
  title: string
  description: string
  action: string
  actionLink: string
  dataPoint: string
}

const DEFAULT_CHECKLIST = [
  { label: 'Practiced 50+ questions per subject', done: false },
  { label: 'Completed 3 full mock exams', done: false },
  { label: 'Reviewed all weak areas', done: false },
  { label: 'Read past examiner reports', done: false },
  { label: 'Memorized key formulas', done: false },
  { label: 'Practiced time management', done: false },
  { label: "Reviewed last year's paper", done: false },
]

const DAILY_QUOTES = [
  'Success is the sum of small efforts repeated day in and day out.',
  'The CA exam is tough, but so are you.',
  "Practice like you've never won. Perform like you've never lost.",
  'Every question you practice brings you one step closer.',
  "Consistency beats talent when talent doesn't work hard.",
  'Your future CA designation is worth every hour of practice.',
  'Focus on progress, not perfection.',
  'The harder you work, the luckier you get.',
  "Don't wish it were easier. Wish you were better.",
  'Champions keep playing until they get it right.',
]

const SUBJECT_ACCENTS: Record<string, string> = {
  BAEIVI: '#16a34a',
  BAEIVII: '#16a34a',
  BAEIV2E: '#2563eb',
  FOA: '#7c3aed',
  QAFB: '#ea580c',
}

const SUBJECT_SHORT_NAMES: Record<string, string> = {
  BAEIVI: 'BEI Vol I',
  BAEIVII: 'BEI Vol I',
  BAEIV2E: 'BEI Vol II',
  FOA: 'Fund. of Accounting',
  QAFB: 'Quant. Analysis',
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function normalizeCode(code: string) {
  return String(code || '').trim().toUpperCase()
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
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
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false)
  const [feedbackStatusLoaded, setFeedbackStatusLoaded] = useState(false)
  const [betaFeatureLinks, setBetaFeatureLinks] = useState<Array<{ label: string; href: string }>>([])
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null)
  const [profileInstitute, setProfileInstitute] = useState('')
  const [profileStreak, setProfileStreak] = useState<StreakInfo>({
    current: 0,
    best: 0,
    practicedToday: false,
    lastPracticeDate: null,
  })
  const [streakResetTimezone, setStreakResetTimezone] = useState<StreakResetTimezone>('UTC')
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([])
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeProgress | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [isExamEditorOpen, setIsExamEditorOpen] = useState(false)
  const [baeWeakArea, setBaeWeakArea] = useState<BaeWeakAreaSummary | null>(null)
  const [showBaeAnalysis, setShowBaeAnalysis] = useState(false)
  const [recommendations, setRecommendations] = useState<DashboardRecommendation[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)
  const [showPerformanceAnalytics, setShowPerformanceAnalytics] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [fsSummary, setFsSummary] = useState<{
    totalCases: number
    totalQuestions: number
    totalAttempts: number
    completedCases: number
    averageScore: number
    bestScore: number
  } | null>(null)

  useEffect(() => {
    if (authLoading || !user?.id) return
    void fetchDashboardData()
  }, [authLoading, user?.id, streakResetTimezone])

  useEffect(() => {
    if (authLoading || !user?.id) return
    if (!showRecommendations) {
      setRecommendations([])
      setRecommendationsLoading(false)
      setRecommendationsError(null)
      return
    }
    void fetchDashboardRecommendations()
  }, [authLoading, user?.id, showRecommendations])

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
          setBetaFeatureLinks([])
          return
        }

        const data = await response.json()
        setAdsEnabled(Boolean(data.adsEnabled))
        setAdContent(data.adContent || fallbackAds)
        setStreakResetTimezone(data?.testSettings?.streakResetTimezone === 'PKT' ? 'PKT' : 'UTC')
        const betaSettings = extractBetaFeatureSettings(data?.testSettings || {})
        const isPrivileged = user?.role === 'admin' || user?.role === 'super_admin'
        const canAccessPerformance =
          isPrivileged || canAccessBetaFeature(betaSettings.performanceAnalytics, user?.studentRole)
        const canAccessRecommendations =
          isPrivileged || canAccessBetaFeature(betaSettings.aiRecommendations, user?.studentRole)
        setShowPerformanceAnalytics(canAccessPerformance)
        setShowRecommendations(canAccessRecommendations)
        if (user?.studentRole === 'ambassador') {
          const links = betaFeatureDefinitions
            .filter((feature) => betaSettings[feature.key] !== 'public')
            .map((feature) => ({ label: feature.label, href: feature.href }))
          setBetaFeatureLinks(links)
        } else {
          setBetaFeatureLinks([])
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        setAdsEnabled(false)
        setAdContent(fallbackAds)
        setBetaFeatureLinks([])
        setStreakResetTimezone('UTC')
        setShowPerformanceAnalytics(false)
        setShowRecommendations(false)
      } finally {
        setAdsLoaded(true)
      }
    }

    void loadSettings()
  }, [user?.role, user?.studentRole])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.dashboard-reveal'))
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.16 }
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [subjects.length, checklist.length, isLoading, fsSummary])

  useEffect(() => {
    if (celebrationBadge) return
    const nextBadge = badgeProgress.find((badge) => badge.earned && !badge.seen)
    if (nextBadge) {
      setCelebrationBadge(nextBadge)
    }
  }, [badgeProgress, celebrationBadge])

  useEffect(() => {
    if (!celebrationBadge) return
    const timer = window.setTimeout(() => {
      void dismissBadgeCelebration()
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [celebrationBadge])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      if (!user?.id) return

      const subResponse = await fetch('/api/admin/subjects')
      const subData = await subResponse.json()
      const dbSubjects = subData.subjects || []

      const statsResponse = await fetch(`/api/dashboard/stats?userId=${user.id}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        const statsMap = new Map<string, any>(statsData.stats.map((item: any) => [item.code, item]))
        setGlobalStats(statsData.globalStats)

        const updatedSubjects = dbSubjects.map((subject: any) => {
          const stats = statsMap.get(subject.code) || {}
          const diffCounts = stats.difficultyCounts || { total: 0, easy: 0, medium: 0, hard: 0 }
          return {
            name: subject.name,
            code: subject.code,
            totalQuestions: diffCounts.total || 0,
            easyQuestions: diffCounts.easy || 0,
            mediumQuestions: diffCounts.medium || 0,
            hardQuestions: diffCounts.hard || 0,
            completedQuestions: stats.completedQuestions || 0,
            progressPercent: stats.progressPercent || 0,
            testCount: Number(stats.testCount) || 0,
            lastPracticedAt: stats.lastPracticedAt || null,
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
        setChecklist(userProfile.prepChecklist?.length ? userProfile.prepChecklist : DEFAULT_CHECKLIST)
        setProfileCreatedAt(userProfile.createdAt || null)
        setProfileInstitute(userProfile.institute || '')
        const lastPracticeDate = userProfile.practiceStreakLastDate
          ? getDateKeyInTimezone(new Date(userProfile.practiceStreakLastDate), streakResetTimezone)
          : null
        setProfileStreak({
          current: Number(userProfile.practiceStreakCurrent) || 0,
          best: Number(userProfile.practiceStreakBest) || 0,
          practicedToday: lastPracticeDate === getDateKeyInTimezone(new Date(), streakResetTimezone),
          lastPracticeDate,
        })
      }

      try {
        const badgesResponse = await fetch('/api/user/badges', { cache: 'no-store' })
        if (badgesResponse.ok) {
          const badgesData = await badgesResponse.json()
          const rows = Array.isArray(badgesData?.badges) ? badgesData.badges : []
          if (rows.length) {
            setBadgeProgress(rows)
          } else {
            setBadgeProgress(
              STREAK_BADGE_DEFINITIONS.map((badge) => ({
                ...badge,
                earned: false,
                earnedAt: null,
                seen: true,
              }))
            )
          }
        } else {
          setBadgeProgress(
            STREAK_BADGE_DEFINITIONS.map((badge) => ({
              ...badge,
              earned: false,
              earnedAt: null,
              seen: true,
            }))
          )
        }
      } catch {
        setBadgeProgress(
          STREAK_BADGE_DEFINITIONS.map((badge) => ({
            ...badge,
            earned: false,
            earnedAt: null,
            seen: true,
          }))
        )
      }

      try {
        const feedbackResponse = await fetch('/api/user/feedback', { cache: 'no-store' })
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json()
          setHasSubmittedFeedback(Boolean(feedbackData?.hasSubmitted))
        } else {
          setHasSubmittedFeedback(false)
        }
      } catch (error) {
        setHasSubmittedFeedback(false)
      } finally {
        setFeedbackStatusLoaded(true)
      }

      const fsResponse = await fetch('/api/financial-statements/summary')
      if (fsResponse.ok) {
        const fsData = await fsResponse.json()
        setFsSummary(fsData)
      } else {
        setFsSummary(null)
      }

      try {
        const baeWeakResponse = await fetch('/api/bae-mock/weak-area', { cache: 'no-store' })
        if (baeWeakResponse.ok) {
          const baeWeakData = await baeWeakResponse.json()
          setBaeWeakArea(baeWeakData)
        } else {
          setBaeWeakArea(null)
        }
      } catch {
        setBaeWeakArea(null)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDashboardRecommendations = async () => {
    try {
      setRecommendationsLoading(true)
      setRecommendationsError(null)
      const response = await fetch('/api/analytics/recommendations?range=all&compact=1&limit=3', {
        cache: 'no-store',
      })

      if (response.status === 403) {
        setShowRecommendations(false)
        setRecommendations([])
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load recommendations')
      }

      const data = await response.json()
      const rows = Array.isArray(data?.recommendations) ? (data.recommendations as DashboardRecommendation[]) : []
      setRecommendations(rows)

      if (data?.notEnoughData) {
        setRecommendationsError('Complete at least 10 questions to unlock personalized recommendations.')
      } else {
        setRecommendationsError(null)
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error)
      setRecommendations([])
      setRecommendationsError('Recommendations are temporarily unavailable.')
    } finally {
      setRecommendationsLoading(false)
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
      if (!response.ok) throw new Error('Failed to save plan')
      toast({ title: 'Plan saved', description: 'Your exam planner updates were saved.' })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Unable to save your plan right now.',
        variant: 'destructive',
      })
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

  async function dismissBadgeCelebration() {
    const badge = celebrationBadge
    if (!badge) return

    setCelebrationBadge(null)
    setBadgeProgress((prev) =>
      prev.map((item) =>
        item.badgeType === badge.badgeType
          ? { ...item, seen: true }
          : item
      )
    )

    try {
      await fetch('/api/user/badges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeType: badge.badgeType }),
      })
    } catch {
      // ignore - UI already marked it as seen for this session
    }
  }

  const scrollToPractice = () => {
    document
      .querySelector('#continue-learning')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const timeBasedGreeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }, [])

  const todayDisplay = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    []
  )

  const quoteOfDay = useMemo(() => {
    const day = new Date().getDate()
    return DAILY_QUOTES[day % DAILY_QUOTES.length]
  }, [])

  const streakResetText = useMemo(
    () => getStreakResetLabel(streakResetTimezone),
    [streakResetTimezone]
  )

  const resolvedStreak: StreakInfo = useMemo(() => {
    const apiStreak = globalStats?.streak
    if (apiStreak) {
      return {
        current: Number(apiStreak.current) || 0,
        best: Number(apiStreak.best) || 0,
        practicedToday: Boolean(apiStreak.practicedToday),
        lastPracticeDate: apiStreak.lastPracticeDate || null,
      }
    }
    return profileStreak
  }, [globalStats?.streak, profileStreak])

  const statsSummary = useMemo(() => {
    const questionsPracticed = Number(globalStats?.totalQuestionsPracticed) || 0
    const questionsToday = Number(globalStats?.todayQuestionsPracticed) || 0
    const averageAccuracy = Number(globalStats?.averageAccuracy) || 0
    const startedFromApi = Number(globalStats?.startedSubjects)
    const subjectsStarted =
      Number.isFinite(startedFromApi) && startedFromApi >= 0
        ? startedFromApi
        : subjects.filter((subject) => subject.completedQuestions > 0).length

    return {
      questionsPracticed,
      questionsToday,
      averageAccuracy,
      subjectsStarted,
      allZero:
        questionsPracticed === 0 &&
        averageAccuracy === 0 &&
        resolvedStreak.current === 0 &&
        subjectsStarted === 0,
    }
  }, [globalStats, subjects, resolvedStreak.current])

  const modeCompletionCounts = useMemo(
    () => ({
      baeMock: Number(globalStats?.modeCompletions?.baeMock) || 0,
      weekIntensive: Number(globalStats?.modeCompletions?.weekIntensive) || 0,
      wrongAnswers: Number(globalStats?.modeCompletions?.wrongAnswers) || 0,
      financialStatements: Number(globalStats?.modeCompletions?.financialStatements) || 0,
    }),
    [globalStats?.modeCompletions]
  )

  const baeFocusLabel = useMemo(() => {
    if (!baeWeakArea?.unlocked) return null
    if (!baeWeakArea.comparison.weakerVolume) return null
    return baeWeakArea.comparison.weakerVolume === 'VOL1' ? 'Vol I - ITB' : 'Vol II - ECO'
  }, [baeWeakArea])

  const baeTrend = useMemo(() => {
    const points = (baeWeakArea?.history || []).slice(0, 10).reverse()
    if (points.length < 2) return null

    const width = 420
    const height = 140
    const leftPadding = 12
    const rightPadding = 12
    const topPadding = 12
    const bottomPadding = 20
    const usableWidth = width - leftPadding - rightPadding
    const usableHeight = height - topPadding - bottomPadding

    const toPath = (key: 'vol1Accuracy' | 'vol2Accuracy') =>
      points
        .map((point, index) => {
          const x = leftPadding + (index / Math.max(1, points.length - 1)) * usableWidth
          const y = topPadding + ((100 - Number(point[key])) / 100) * usableHeight
          return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
        })
        .join(' ')

    return {
      width,
      height,
      pathVol1: toPath('vol1Accuracy'),
      pathVol2: toPath('vol2Accuracy'),
    }
  }, [baeWeakArea?.history])

  const getSubjectPracticeLabel = (lastPracticedAt: string | null) => {
    if (!lastPracticedAt) {
      return { text: 'Not started yet', tone: 'idle' as const }
    }

    const practicedAt = new Date(lastPracticedAt)
    if (Number.isNaN(practicedAt.getTime())) {
      return { text: 'Not started yet', tone: 'idle' as const }
    }

    const diffDays = Math.max(0, Math.floor((Date.now() - practicedAt.getTime()) / ONE_DAY_MS))
    if (diffDays <= 0) {
      return { text: 'Practiced today', tone: 'today' as const }
    }

    return {
      text: `Last practiced ${diffDays} day${diffDays === 1 ? '' : 's'} ago`,
      tone: 'past' as const,
    }
  }

  const accuracyValueColor =
    statsSummary.averageAccuracy > 80
      ? 'text-emerald-600'
      : statsSummary.averageAccuracy >= 60
        ? 'text-amber-600'
        : 'text-rose-600'

  const fsProgressPercent = fsSummary
    ? Math.round((fsSummary.totalCases ? (fsSummary.completedCases / fsSummary.totalCases) * 100 : 0))
    : 0

  const countdown = useMemo(() => {
    if (!examDate) return null
    const target = new Date(`${examDate}T23:59:59`)
    if (Number.isNaN(target.getTime())) return null
    const diff = Math.max(0, target.getTime() - currentTime)
    const days = Math.floor(diff / ONE_DAY_MS)
    const hours = Math.floor((diff % ONE_DAY_MS) / (60 * 60 * 1000))
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = Math.floor((diff % (60 * 1000)) / 1000)
    return { days, hours, minutes, seconds, totalMs: diff }
  }, [examDate, currentTime])

  const prepProgressPercent = useMemo(() => {
    if (!examDate) return 0
    const target = new Date(`${examDate}T23:59:59`).getTime()
    if (Number.isNaN(target)) return 0
    const prepStart = profileCreatedAt ? new Date(profileCreatedAt).getTime() : Date.now()
    if (Number.isNaN(prepStart) || target <= prepStart) return 0
    const elapsed = Date.now() - prepStart
    return clampPercent((elapsed / (target - prepStart)) * 100)
  }, [examDate, profileCreatedAt, currentTime])

  const checklistItems = useMemo(
    () =>
      checklist
        .map((item, index) => ({ ...item, index }))
        .sort((a, b) => Number(a.done) - Number(b.done)),
    [checklist]
  )
  const checklistDoneCount = useMemo(() => checklist.filter((item) => item.done).length, [checklist])
  const checklistTotal = checklist.length || 1
  const checklistCompletionPercent = clampPercent((checklistDoneCount / checklistTotal) * 100)

  const nextBadgeHint = useMemo(() => {
    const allBadges = (badgeProgress.length
      ? badgeProgress
      : STREAK_BADGE_DEFINITIONS.map((badge) => ({
          ...badge,
          earned: false,
          earnedAt: null,
          seen: true,
        }))).sort((a, b) => a.milestoneDays - b.milestoneDays)

    const nextBadge = allBadges.find((badge) => !badge.earned)
    const current = Math.max(0, Number(resolvedStreak.current) || 0)

    if (!nextBadge) {
      return {
        text: "You've earned all badges! You're a true CA champion!",
        className: 'border border-[#86efac] bg-[#f0fdf4] text-[#166534]',
      }
    }

    if (current <= 0) {
      return {
        text: `Start a ${nextBadge.milestoneDays} day streak to earn your first badge!`,
        className: 'border border-[#86efac] bg-[#f0fdf4] text-[#166534]',
      }
    }

    const remainingDays = Math.max(0, nextBadge.milestoneDays - current)

    if (!resolvedStreak.practicedToday) {
      return {
        text: `Practice today to keep your streak - only ${remainingDays} more days to ${nextBadge.name}!`,
        className: 'border border-[#fcd34d] bg-[#fef9c3] text-[#854d0e]',
      }
    }

    return {
      text: `${nextBadge.icon} ${remainingDays} more days to earn ${nextBadge.name} badge!`,
      className: 'border border-[#86efac] bg-[#f0fdf4] text-[#166534]',
    }
  }, [badgeProgress, resolvedStreak.current, resolvedStreak.practicedToday])

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
    <main className="dashboard-shell min-h-screen bg-[#f8fafc]">
      <Navigation />

      <div className="pt-[74px] pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {adsLoaded && adsEnabled && adContent?.dashboard && (
            <div className="pt-6 mb-6">
              <AdSlot
                placement="dashboard"
                headline={adContent.dashboard.headline}
                body={adContent.dashboard.body}
                cta={adContent.dashboard.cta}
                href={adContent.dashboard.href}
              />
            </div>
          )}

          <div className="mb-4 flex items-center justify-end">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-green transition-colors"
            >
              <Settings size={15} />
              Account Settings
            </Link>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-6">
            <aside className="space-y-6 order-2 xl:order-1">
              <Card className="hidden xl:block bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-[#dcfce7]"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary-green/10 text-primary-green font-bold flex items-center justify-center">
                        {String(user.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                      <p className="text-xl font-black text-slate-900">{statsSummary.questionsPracticed}</p>
                      <p className="text-[11px] text-slate-500">Practiced</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                      <p className="text-xl font-black text-slate-900">{statsSummary.subjectsStarted}</p>
                      <p className="text-[11px] text-slate-500">Subjects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Exam Snapshot</h3>
                  {countdown ? (
                    <>
                      <p className="text-xs text-slate-500">{examName || 'Your upcoming exam'}</p>
                      <p className="text-2xl font-black text-primary-green">{countdown.days} days</p>
                      <Progress value={prepProgressPercent} className="h-2" />
                      <p className="text-xs text-slate-500">{Math.round(prepProgressPercent)}% through prep timeline</p>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                      <CalendarDays size={18} className="mx-auto text-slate-500" />
                      <p className="mt-2 text-xs text-slate-600">No exam date set yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {reviewDueCount > 0 && (
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Review Queue</h3>
                    <p className="text-sm text-slate-600">{reviewDueCount} questions due now.</p>
                    <Button className="w-full" onClick={() => window.location.assign('/review')}>
                      Start Review
                    </Button>
                    <NotificationOptIn />
                  </CardContent>
                </Card>
              )}

              {betaFeatureLinks.length > 0 ? (
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                  <CardContent className="p-5 space-y-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">Beta Access</p>
                    {betaFeatureLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block text-sm text-slate-700 hover:text-primary-green transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </aside>

            <section className="space-y-6 order-1 xl:order-2">
              <Card className="border-0 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0f172a,#0d2137)] text-white shadow-xl">
                <CardContent className="p-6 md:p-8 relative">
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-green-400/10 blur-2xl" />
                    <div className="absolute -bottom-16 right-0 h-44 w-44 rounded-full bg-green-300/10 blur-2xl" />
                  </div>
                  <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black">
                        {timeBasedGreeting}, {user.name.split(' ')[0]}!
                      </h1>
                      <p className="text-sm text-white/70 mt-2">Ready to ace your CA exam today?</p>
                      <p className="text-xs text-white/50 mt-1">{todayDisplay}</p>
                    </div>
                    <Button
                      className="h-12 px-6 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold shadow-[0_4px_14px_rgba(22,163,74,0.4)]"
                      onClick={scrollToPractice}
                    >
                      Start Practicing Now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="dashboard-reveal rounded-r-xl border-l-4 border-primary-green bg-[#f0fdf4] px-4 py-3">
                <p className="text-sm italic text-[#166534]">{quoteOfDay}</p>
              </div>

              <div className="profile-streak-container dashboard-reveal">
                <Card className="profile-card rounded-2xl border border-slate-200 bg-white shadow-sm xl:hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-[52px] w-[52px] rounded-full object-cover border-2 border-[#dcfce7]"
                        />
                      ) : (
                        <div className="h-[52px] w-[52px] rounded-full bg-primary-green/10 text-primary-green font-bold flex items-center justify-center">
                          {String(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{profileInstitute || user.email}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1.5 text-center">
                            <p className="text-sm font-black text-slate-900">{statsSummary.questionsPracticed}</p>
                            <p className="text-[10px] text-slate-500">Practiced</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1.5 text-center">
                            <p className="text-sm font-black text-slate-900">{resolvedStreak.current}</p>
                            <p className="text-[10px] text-slate-500">Day Streak</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`streak-widget rounded-2xl border-0 text-white shadow-lg ${
                    resolvedStreak.practicedToday
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                      : 'bg-gradient-to-br from-orange-500 to-orange-700 dashboard-streak-pulse'
                  }`}
                >
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Flame size={30} />
                        <div>
                          <p className="text-4xl md:text-5xl font-black leading-none">{resolvedStreak.current}</p>
                          <p className="text-xs uppercase tracking-[0.1em] text-orange-100">Day Streak</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-orange-100">Best: {resolvedStreak.best} days</p>
                        <p className="text-xs text-orange-100 mt-1">
                          {resolvedStreak.practicedToday
                            ? 'You are safe for today.'
                            : 'Practice today to keep your streak alive!'}
                        </p>
                        <p className="text-[11px] text-orange-100/90 mt-2">{streakResetText}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="badge-row rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">Streak Milestones</h3>
                      <p className="text-xs text-slate-500">Earn badges as your streak grows</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(badgeProgress.length ? badgeProgress : STREAK_BADGE_DEFINITIONS.map((badge) => ({
                        ...badge,
                        earned: false,
                        earnedAt: null,
                        seen: true,
                      }))).map((badge) => {
                        const earnedDate = badge.earnedAt
                          ? new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }).format(new Date(badge.earnedAt))
                          : null
                        return (
                          <div
                            key={badge.badgeType}
                            className={`rounded-xl border p-3 text-center transition-all ${
                              badge.earned
                                ? 'border-[#86efac] bg-[#f0fdf4] shadow-sm'
                                : 'border-slate-200 bg-slate-50 opacity-80'
                            }`}
                            title={
                              badge.earned
                                ? `${badge.name} - earned ${earnedDate}`
                                : `${badge.name} - unlock at ${badge.milestoneDays} day streak`
                            }
                          >
                            <div
                              className={`mx-auto h-10 w-10 rounded-full text-lg flex items-center justify-center ${
                                badge.earned ? `bg-gradient-to-br ${badge.colorClass} text-white shadow-[0_0_12px_rgba(22,163,74,0.35)]` : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {badge.icon}
                            </div>
                            <p className="mt-2 text-xs font-semibold text-slate-800">{badge.name}</p>
                            <p className="text-[11px] text-slate-500">{badge.milestoneDays} days</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-3 flex justify-center">
                      <p
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium ${nextBadgeHint.className}`}
                      >
                        {nextBadgeHint.text}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="dashboard-reveal">
                <h2 className="dashboard-section-title">Quick Stats</h2>
                <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="dashboard-stat-card h-full">
                    <CardContent className="h-full p-4 sm:p-5 text-center sm:text-left">
                      <div className="dashboard-icon-circle mx-auto sm:mx-0 bg-green-100 text-green-600">
                        <BookOpen size={18} />
                      </div>
                      <p className="mt-3 text-xl sm:text-2xl font-black text-slate-900">{statsSummary.questionsPracticed}</p>
                      <p className="text-[11px] sm:text-sm font-semibold text-slate-700">Questions Practiced</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {statsSummary.questionsToday > 0 ? `+${statsSummary.questionsToday} today` : 'No attempts today'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-stat-card h-full">
                    <CardContent className="h-full p-4 sm:p-5 text-center sm:text-left">
                      <div className="dashboard-icon-circle mx-auto sm:mx-0 bg-orange-100 text-orange-600">
                        <Zap size={18} />
                      </div>
                      <p className="mt-3 text-xl sm:text-2xl font-black text-slate-900">{resolvedStreak.current}</p>
                      <p className="text-[11px] sm:text-sm font-semibold text-slate-700">Day Streak</p>
                      <p className="text-[11px] text-slate-500 mt-1">Best {resolvedStreak.best} days</p>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-stat-card h-full">
                    <CardContent className="h-full p-4 sm:p-5 text-center sm:text-left">
                      <div className="dashboard-icon-circle mx-auto sm:mx-0 bg-blue-100 text-blue-600">
                        <Target size={18} />
                      </div>
                      <p className={`mt-3 text-xl sm:text-2xl font-black ${accuracyValueColor}`}>
                        {statsSummary.allZero ? '--' : `${statsSummary.averageAccuracy}%`}
                      </p>
                      <p className="text-[11px] sm:text-sm font-semibold text-slate-700">Avg Accuracy</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {statsSummary.allZero ? 'Start practicing to see your stats!' : 'Across all attempts'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-stat-card h-full">
                    <CardContent className="h-full p-4 sm:p-5 text-center sm:text-left">
                      <div className="dashboard-icon-circle mx-auto sm:mx-0 bg-purple-100 text-purple-600">
                        <Layers size={18} />
                      </div>
                      <p className="mt-3 text-xl sm:text-2xl font-black text-slate-900">
                        {statsSummary.subjectsStarted}/{subjects.length || 4}
                      </p>
                      <p className="text-[11px] sm:text-sm font-semibold text-slate-700">Subjects Active</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {showRecommendations ? (
                <div className="dashboard-reveal">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="dashboard-section-title !mb-0">Recommended for You</h2>
                    <Link
                      href="/dashboard/analytics#study-recommendations"
                      className="text-xs sm:text-sm font-medium text-primary-green hover:text-green-700"
                    >
                      See All -&gt;
                    </Link>
                  </div>

                  <Card className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      {recommendationsLoading ? (
                        <div className="space-y-2">
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                          ))}
                        </div>
                      ) : recommendations.length > 0 ? (
                        recommendations.slice(0, 3).map((item, index) => {
                          const theme =
                            item.priority === 'critical'
                              ? {
                                  border: 'border-l-red-500',
                                  badge: 'bg-red-50 text-red-700',
                                  button: 'border-red-200 text-red-700 hover:bg-red-600',
                                }
                              : item.priority === 'high'
                                ? {
                                    border: 'border-l-amber-500',
                                    badge: 'bg-amber-50 text-amber-700',
                                    button: 'border-amber-200 text-amber-700 hover:bg-amber-600',
                                  }
                                : item.priority === 'medium'
                                  ? {
                                      border: 'border-l-blue-500',
                                      badge: 'bg-blue-50 text-blue-700',
                                      button: 'border-blue-200 text-blue-700 hover:bg-blue-600',
                                    }
                                  : {
                                      border: 'border-l-emerald-500',
                                      badge: 'bg-emerald-50 text-emerald-700',
                                      button: 'border-emerald-200 text-emerald-700 hover:bg-emerald-600',
                                    }

                          return (
                            <div
                              key={`${item.type}-${index}`}
                              className={`rounded-xl border border-slate-200 border-l-4 ${theme.border} px-3 py-3`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${theme.badge}`}>
                                  {item.priority}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
                                  {item.dataPoint}
                                </span>
                                <Link href={item.actionLink} className="shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-7 text-[11px] transition-colors ${theme.button} hover:text-white`}
                                  >
                                    {item.action}
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                          {recommendationsError || 'No recommendations yet.'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {statsSummary.questionsPracticed === 0 ? (
                <div className="dashboard-reveal rounded-2xl border border-[#86efac] bg-[#f0fdf4] p-4">
                  <p className="text-sm font-medium text-[#166534]">
                    Welcome to Preptio, {user.name.split(' ')[0]}! Pick a subject below and take your first practice test to get started.
                  </p>
                </div>
              ) : null}

              <div id="practice-modes" className="dashboard-reveal scroll-mt-24">
                <h2 className="dashboard-section-title">How Would You Like to Practice?</h2>

                <Card className="dashboard-quiz-feature mt-4 overflow-hidden">
                  <CardContent className="p-6 md:p-7">
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-6 md:gap-8 items-center">
                      <div>
                        <span className="inline-flex items-center rounded-full border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.15)] px-3 py-1 text-[11px] font-bold tracking-wide text-[#4ade80]">
                          MOST POWERFUL FEATURE
                        </span>
                        <h3 className="mt-3 text-white text-xl md:text-[22px] font-black">Build Your Custom Quiz</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/75">
                          You are in control. Choose your subjects, pick specific chapters, set the difficulty, decide the
                          number of questions, and create a test tailored to your weak areas.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85">Choose Subjects</span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85">Pick Chapters</span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85">Set Difficulty</span>
                        </div>
                        <Button
                          className="mt-5 rounded-xl bg-[#16a34a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#22c55e] hover:-translate-y-0.5 transition-all"
                          onClick={() => window.location.assign('/custom-quiz')}
                        >
                          Build My Quiz
                          <ArrowRight size={16} className="ml-1" />
                        </Button>
                      </div>

                      <div className="dashboard-quiz-mockup hidden md:block rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/85">
                        <div className="space-y-2">
                          <p>[x] FOA</p>
                          <p>[x] {BAE_VOL1_CODE}</p>
                          <p>[ ] QAFB</p>
                        </div>
                        <div className="my-3 border-t border-white/15" />
                        <p>Questions: 20</p>
                        <p className="mt-2">########.. Hard</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="dashboard-feature-card md:col-span-2">
                    <CardContent className="p-6 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#16a34a,#2563eb)]" />
                      <BookOpen size={90} className="absolute -top-2 -right-2 text-emerald-500/10" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="dashboard-mode-icon bg-[linear-gradient(135deg,rgba(22,163,74,0.12),rgba(37,99,235,0.12))] text-[#16a34a]">
                          <BookOpen size={28} />
                        </div>
                        <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2563eb]">
                          ICAP Pattern
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-900">BAE Mock Test</h3>
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                        Experience the real ICAP exam format - a timed mix of Business &amp; Economic Insights Vol I (ITB)
                        and Vol II (ECO). Vol II questions always match or exceed Vol I based on historical student reports.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">{BAE_VOL1_CODE}</span>
                        <span className="rounded-full bg-[#dbeafe] px-2.5 py-1 text-[11px] font-semibold text-[#1d4ed8]">{BAE_VOL2_CODE}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        50 Questions · {calculateBaeTimeAllowedMinutes(50)} Minutes · Mixed Ratio
                      </p>
                      {baeWeakArea?.unlocked && baeFocusLabel ? (
                        <p className="mt-2 inline-flex rounded-md bg-[#fef9c3] px-2.5 py-1 text-[11px] font-semibold text-[#854d0e]">
                          Focus needed: {baeFocusLabel}
                        </p>
                      ) : null}
                      {modeCompletionCounts.baeMock > 0 ? (
                        <p className="mt-2 text-xs text-slate-500">Completed {modeCompletionCounts.baeMock} times</p>
                      ) : null}
                      <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                        <Button
                          className="w-full bg-[linear-gradient(135deg,#16a34a,#2563eb)] hover:brightness-110 text-white"
                          onClick={() => window.location.assign('/practice/bae-mock')}
                        >
                          Start Mock Test
                          <ArrowRight size={16} className="ml-1" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-xs text-slate-500"
                          onClick={() => setShowBaeAnalysis((prev) => !prev)}
                        >
                          {showBaeAnalysis ? 'Hide Analysis ▲' : 'View Analysis ▼'}
                        </Button>

                        {showBaeAnalysis ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                            {!baeWeakArea || !baeWeakArea.unlocked ? (
                              <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-600">
                                Complete {baeWeakArea?.remainingForUnlock ?? 3} more BAE mock tests to unlock your weak area analysis.
                              </div>
                            ) : (
                              <>
                                <div>
                                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                                    <span>Vol I - ITB</span>
                                    <span className="font-semibold text-slate-900">{baeWeakArea.accuracy.vol1}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-[#16a34a]" style={{ width: `${baeWeakArea.accuracy.vol1}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                                    <span>Vol II - ECO</span>
                                    <span className="font-semibold text-slate-900">{baeWeakArea.accuracy.vol2}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${baeWeakArea.accuracy.vol2}%` }} />
                                  </div>
                                </div>
                                <div
                                  className={`rounded-lg px-3 py-2 text-xs ${
                                    baeWeakArea.comparison.difference < 10
                                      ? 'bg-[#f0fdf4] text-[#166534]'
                                      : baeWeakArea.comparison.difference < 25
                                        ? 'bg-[#fef9c3] text-[#854d0e]'
                                        : 'bg-[#fee2e2] text-[#991b1b]'
                                  }`}
                                >
                                  {baeWeakArea.comparison.difference < 10 ? (
                                    <span>Well balanced across both volumes.</span>
                                  ) : (
                                    <span>
                                      Focus Area: {baeWeakArea.comparison.weakerVolume === 'VOL1' ? 'Vol I - ITB' : 'Vol II - ECO'} (
                                      {baeWeakArea.comparison.difference}% gap)
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-feature-card">
                    <CardContent className="p-6 relative overflow-hidden">
                      <BookOpen size={84} className="absolute -top-2 -right-2 text-green-500/5" />
                      <div className="dashboard-mode-icon bg-green-100 text-green-600">
                        <BookOpen size={24} />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-900">Week Intensive Mode</h3>
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                        Focus on your 3 weakest chapters and improve to 75% accuracy.
                      </p>
                      {modeCompletionCounts.weekIntensive > 0 ? (
                        <p className="mt-3 text-xs text-slate-500">Completed {modeCompletionCounts.weekIntensive} times</p>
                      ) : null}
                      <Button className="mt-4 w-full bg-green-600 hover:bg-green-700" onClick={() => window.location.assign('/weak-area')}>
                        Start Intensive
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-feature-card dashboard-feature-card-orange">
                    <CardContent className="p-6 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1 bg-[#ea580c]" />
                      <AlertCircle size={84} className="absolute -top-2 -right-2 text-[#ea580c]/10" />
                      <div className="dashboard-mode-icon bg-[#fff7ed] text-[#ea580c]">
                        <AlertCircle size={24} />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-900">Practice Wrong Answers</h3>
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                        Retry the questions you answered incorrectly, subject by subject.
                      </p>
                      {modeCompletionCounts.wrongAnswers > 0 ? (
                        <p className="mt-3 text-xs text-slate-500">Completed {modeCompletionCounts.wrongAnswers} times</p>
                      ) : null}
                      <Button className="mt-4 w-full bg-[#ea580c] hover:bg-[#c2410c]" onClick={() => window.location.assign('/wrong-answers')}>
                        Start Practice
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-feature-card md:col-span-2">
                    <CardContent className="p-6 relative overflow-hidden">
                      <FileText size={92} className="absolute -top-3 right-3 text-blue-500/5" />
                      <div className="dashboard-mode-icon bg-blue-100 text-blue-600">
                        <FileText size={24} />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-900">Financial Statements Practice</h3>
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                        Trial balance cases with SOCI and SOFP dropdown selections.
                      </p>
                      {modeCompletionCounts.financialStatements > 0 ? (
                        <p className="mt-3 text-xs text-slate-500">Completed {modeCompletionCounts.financialStatements} times</p>
                      ) : null}
                      {fsSummary ? (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Your Progress</span>
                            <span className="font-semibold text-blue-700">{fsProgressPercent}%</span>
                          </div>
                          <Progress value={fsProgressPercent} className="h-2.5" />
                          <p className="text-xs text-slate-500">
                            {fsSummary.completedCases}/{fsSummary.totalCases} cases completed - Questions: {fsSummary.totalQuestions}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-slate-500">Loading your progress...</p>
                      )}
                      <Button className="mt-4 w-full md:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => window.location.assign('/financial-statements')}>
                        Start Practice
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div id="continue-learning" className="dashboard-reveal scroll-mt-24">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="dashboard-section-title !mb-0">Continue Learning</h2>
                  <Link href="/subjects" className="text-sm font-medium text-primary-green hover:text-green-700 transition-colors">
                    View All Subjects &gt;
                  </Link>
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-primary-green" size={36} />
                  </div>
                ) : subjects.length === 0 ? (
                  <Card className="border border-slate-200 rounded-2xl bg-white">
                    <CardContent className="p-10 text-center text-slate-500">No subjects found. Please contact admin.</CardContent>
                  </Card>
                ) : (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {subjects.map((subject, index) => {
                      const code = normalizeCode(subject.code)
                      const accent = SUBJECT_ACCENTS[code] || ['#16a34a', '#2563eb', '#7c3aed', '#ea580c'][index % 4]
                      const subjectLabel = SUBJECT_SHORT_NAMES[code] || subject.name || code
                      const practiceStatus = getSubjectPracticeLabel(subject.lastPracticedAt)
                      return (
                        <Card key={`${subject.code}-${index}`} className="dashboard-subject-card group rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <CardContent className="p-4 md:p-5" style={{ borderTop: `3px solid ${accent}` }}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">{subjectLabel}</p>
                              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{code}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <p
                                className={`text-[11px] ${
                                  practiceStatus.tone === 'idle'
                                    ? 'text-[#c2410c]'
                                    : practiceStatus.tone === 'today'
                                      ? 'text-emerald-600'
                                      : 'text-slate-400'
                                }`}
                              >
                                {practiceStatus.tone === 'idle' ? <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#fb923c]" /> : null}
                                {practiceStatus.text}
                              </p>
                              <Link
                                href={`/subjects/${encodeURIComponent(subject.code)}/test?mode=${SUBJECT_TEST_MODES.mock}`}
                                className="dashboard-quick-start shrink-0"
                                onClick={() =>
                                  trackSubjectActionClick({
                                    action: 'quick_start',
                                    subjectCode: subject.code,
                                    source: 'dashboard',
                                  })
                                }
                              >
                                <Button
                                  size="sm"
                                  className="h-7 rounded-lg px-2.5 text-[11px] font-semibold text-white hover:brightness-95"
                                  style={{ backgroundColor: accent }}
                                >
                                  {PRACTICE_LABELS.quickStart}
                                </Button>
                              </Link>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{subject.progressPercent}% progress</span>
                                <span>{subject.completedQuestions}/{subject.totalQuestions} completed</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${subject.progressPercent}%`, backgroundColor: accent }} />
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <Link
                                href={`/subjects/${encodeURIComponent(subject.code)}?mode=${SUBJECT_TEST_MODES.chapter}`}
                                className="w-full"
                                onClick={() =>
                                  trackSubjectActionClick({
                                    action: 'chapter_wise',
                                    subjectCode: subject.code,
                                    source: 'dashboard',
                                  })
                                }
                              >
                                <Button
                                  className="w-full text-xs text-white hover:brightness-95"
                                  style={{ backgroundColor: accent }}
                                >
                                  {PRACTICE_LABELS.chapterWise}
                                </Button>
                              </Link>
                              <Link
                                href={`/subjects/${encodeURIComponent(subject.code)}/test?mode=${SUBJECT_TEST_MODES.mock}`}
                                className="w-full"
                                onClick={() =>
                                  trackSubjectActionClick({
                                    action: 'mock_test',
                                    subjectCode: subject.code,
                                    source: 'dashboard',
                                  })
                                }
                              >
                                <Button
                                  variant="outline"
                                  className="w-full bg-white text-xs border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-700 focus-visible:text-slate-700"
                                >
                                  {PRACTICE_LABELS.mockTest}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              <div id="study-tools" className="dashboard-reveal scroll-mt-24">
                <h2 className="dashboard-section-title">Study Tools</h2>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="dashboard-feature-card">
                    <CardContent className="p-6 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1 bg-green-600" />
                      <CalendarDays size={84} className="absolute -top-2 -right-2 text-green-500/5" />
                      <div className="dashboard-mode-icon bg-green-100 text-green-600">
                        <CalendarDays size={24} />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-900">Study Planner</h3>
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                        Plan your daily study sessions and stay on track.
                      </p>
                      <Button className="mt-4 w-full bg-green-600 hover:bg-green-700" onClick={() => window.location.assign('/study-planner')}>
                        Open Planner
                      </Button>
                    </CardContent>
                  </Card>

                  {showPerformanceAnalytics ? (
                    <Card className="dashboard-feature-card">
                      <CardContent className="p-6 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
                        <BarChart2 size={84} className="absolute -top-2 -right-2 text-blue-500/5" />
                        <div className="dashboard-mode-icon bg-blue-100 text-blue-600">
                          <BarChart2 size={24} />
                        </div>
                        <h3 className="mt-4 text-base font-bold text-slate-900">My Analytics</h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          Track your performance and identify weak areas.
                        </p>
                        <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700" onClick={() => window.location.assign('/dashboard/analytics')}>
                          View Analytics
                        </Button>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.location.assign('/study-session')}>Study Session</Button>
                  <Button variant="outline" onClick={() => window.location.assign('/notes')}>Notes & Flashcards</Button>
                  <Button onClick={() => window.location.assign('/exam-simulator')}>Exam Simulator</Button>
                </div>
              </div>

              <div className="dashboard-reveal grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card id="exam-countdown" className="rounded-2xl border border-slate-200 bg-white shadow-sm scroll-mt-24">
                  <CardContent className="p-6">
                    <h2 className="dashboard-section-title">Exam Countdown</h2>

                    {!examDate && !isExamEditorOpen ? (
                      <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <CalendarDays size={34} className="mx-auto text-slate-500" />
                        <p className="mt-2 font-semibold text-slate-800">Set Your Exam Date</p>
                        <p className="text-sm text-slate-500 mt-1">Track your countdown and stay on schedule.</p>
                        <Button variant="outline" className="mt-4 border-primary-green text-primary-green hover:bg-primary-green/5" onClick={() => setIsExamEditorOpen(true)}>
                          Set Exam Date
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="examName">Exam Name</Label>
                            <Input id="examName" placeholder="e.g. CAF Exam" value={examName} onChange={(event) => setExamName(event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="examDate">Exam Date</Label>
                            <Input id="examDate" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
                          </div>
                        </div>
                        {countdown ? (
                          <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1e3a5f)] p-5 text-white">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { label: 'Days', value: countdown.days },
                                { label: 'Hours', value: countdown.hours },
                                { label: 'Mins', value: countdown.minutes },
                                { label: 'Secs', value: countdown.seconds },
                              ].map((item) => (
                                <div key={item.label} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center dashboard-second-tick">
                                  <p className="text-2xl font-black text-green-300">{String(item.value).padStart(2, '0')}</p>
                                  <p className="text-[10px] uppercase tracking-wider text-white/70">{item.label}</p>
                                </div>
                              ))}
                            </div>
                            <p className="mt-3 text-sm text-white/80">{examName || 'Your exam plan'}</p>
                            <div className="mt-3">
                              <Progress value={prepProgressPercent} className="h-2 bg-white/10" />
                              <p className="text-xs text-white/70 mt-1">{Math.round(prepProgressPercent)}% into prep timeline</p>
                            </div>
                            <p className="mt-2 text-xs text-white/80">Keep going - you are making steady progress.</p>
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="dailyGoal" className="text-xs text-slate-500">Daily Target</Label>
                            <Input id="dailyGoal" type="number" min="0" value={dailyQuestionGoal} onChange={(event) => setDailyQuestionGoal(Number(event.target.value) || 0)} className="w-24" />
                          </div>
                          <Button onClick={handleSavePlan} disabled={isSavingPlan}>{isSavingPlan ? 'Saving...' : 'Save Plan'}</Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card id="pre-exam-checklist" className="rounded-2xl border border-slate-200 bg-white shadow-sm scroll-mt-24">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="dashboard-section-title !mb-0">Pre-Exam Checklist</h2>
                      <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-xs font-semibold px-3 py-1">
                        {checklistDoneCount}/{checklist.length || 0} completed
                      </span>
                    </div>

                    <div className="mt-5 flex justify-center">
                      <div className="relative h-24 w-24">
                        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                          <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            stroke="#16a34a"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(2 * Math.PI * 42 * checklistCompletionPercent) / 100} ${2 * Math.PI * 42}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
                          {Math.round(checklistCompletionPercent)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Input placeholder="Add your own checklist item..." value={newChecklistItem} onChange={(event) => setNewChecklistItem(event.target.value)} />
                      <Button type="button" onClick={handleAddChecklistItem} className="gap-2">
                        <Plus size={16} />
                        Add
                      </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {checklistItems.map((item) => (
                        <div key={`${item.label}-${item.index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={(event) => {
                              const next = [...checklist]
                              next[item.index] = { ...item, done: event.target.checked }
                              setChecklist(next)
                            }}
                            className="h-4 w-4 rounded border-slate-300 accent-[#16a34a]"
                          />
                          <Input
                            value={item.label}
                            onChange={(event) => {
                              const next = [...checklist]
                              next[item.index] = { ...item, label: event.target.value }
                              setChecklist(next)
                            }}
                            className={`flex-1 ${item.done ? 'line-through text-slate-400' : ''}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setChecklist((prev) => prev.filter((_, idx) => idx !== item.index))
                            }}
                            className="text-rose-500 hover:text-rose-600"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {checklist.length > 0 && checklistDoneCount === checklist.length ? (
                      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        You are ready for your exam.
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleSavePlan} disabled={isSavingPlan}>
                        {isSavingPlan ? 'Saving...' : 'Save Checklist'}
                      </Button>
                      <Button variant="ghost" onClick={() => setChecklist(DEFAULT_CHECKLIST)} className="text-slate-500">
                        Reset to Default
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div id="performance-tracking" className="dashboard-reveal scroll-mt-24">
                <h2 className="dashboard-section-title">Performance Tracking</h2>
                {baeWeakArea?.history?.length ? (
                  <Card className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">BAE Mock Test History</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary-green"
                          onClick={() => window.location.assign('/practice/bae-mock')}
                        >
                          New Attempt
                        </Button>
                      </div>

                      {baeTrend ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                            <span>Vol I vs Vol II Accuracy Trend</span>
                            <span className="flex items-center gap-3">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                                Vol I
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
                                Vol II
                              </span>
                            </span>
                          </div>
                          <svg viewBox={`0 0 ${baeTrend.width} ${baeTrend.height}`} className="w-full h-28">
                            <path d={baeTrend.pathVol1} fill="none" stroke="#16a34a" strokeWidth="2.5" />
                            <path d={baeTrend.pathVol2} fill="none" stroke="#2563eb" strokeWidth="2.5" />
                          </svg>
                        </div>
                      ) : null}

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-left">
                              <th className="pb-2 pr-3">Date</th>
                              <th className="pb-2 pr-3">Score</th>
                              <th className="pb-2 pr-3">Ratio</th>
                              <th className="pb-2 pr-3">Vol I</th>
                              <th className="pb-2 pr-3">Vol II</th>
                              <th className="pb-2 pr-3">Time</th>
                              <th className="pb-2">Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {baeWeakArea.history.slice(0, 10).map((attempt) => (
                              <tr key={attempt.id} className="border-b border-slate-100 text-slate-700">
                                <td className="py-2 pr-3">{new Date(attempt.date).toLocaleDateString()}</td>
                                <td className="py-2 pr-3">{attempt.scoreText} ({attempt.scorePercent}%)</td>
                                <td className="py-2 pr-3">{attempt.ratioText}</td>
                                <td className="py-2 pr-3">{attempt.vol1Accuracy}%</td>
                                <td className="py-2 pr-3">{attempt.vol2Accuracy}%</td>
                                <td className="py-2 pr-3">
                                  {Math.round((attempt.timeTaken / Math.max(1, attempt.timeAllowed * 60)) * 100)}%
                                </td>
                                <td className="py-2">
                                  <span
                                    className={
                                      attempt.improvementDelta > 0
                                        ? 'text-emerald-600 font-semibold'
                                        : attempt.improvementDelta < 0
                                          ? 'text-rose-600 font-semibold'
                                          : 'text-slate-500'
                                    }
                                  >
                                    {attempt.improvementDelta > 0 ? `+${attempt.improvementDelta}%` : `${attempt.improvementDelta}%`}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
                <div className="mt-4">
                  <RecentActivity />
                </div>
              </div>

              <div className="dashboard-reveal py-2">
                <button
                  type="button"
                  onClick={() => window.location.assign('/feedback?source=dashboard')}
                  className="w-full text-left text-sm text-slate-500 hover:text-primary-green transition-colors break-words"
                >
                  {feedbackStatusLoaded
                    ? hasSubmittedFeedback
                      ? 'Manage Feedback about Preptio'
                      : 'Share Feedback about Preptio'
                    : 'Share Feedback about Preptio'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="px-4 py-3">
          <Button className="w-full h-11 rounded-xl bg-[#16a34a] hover:bg-[#15803d]" onClick={scrollToPractice}>
            Start Practicing Now
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>

      {celebrationBadge ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={index}
                  className="badge-confetti"
                  style={{
                    left: `${(index * 8) % 90 + 5}%`,
                    animationDelay: `${(index % 6) * 0.12}s`,
                  }}
                />
              ))}
            </div>
            <div className="relative z-10">
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${celebrationBadge.colorClass} text-4xl text-white badge-pop`}>
                {celebrationBadge.icon}
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-900">New Badge Earned!</h3>
              <p className="mt-2 text-lg font-bold text-slate-800">{celebrationBadge.name}</p>
              <p className="mt-2 text-sm text-slate-600">
                You have practiced for {celebrationBadge.milestoneDays} consecutive days. Keep it up!
              </p>
              <Button className="mt-6 bg-[#16a34a] hover:bg-[#15803d]" onClick={() => void dismissBadgeCelebration()}>
                Awesome!
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .dashboard-shell::-webkit-scrollbar { width: 6px; height: 6px; }
        .dashboard-shell::-webkit-scrollbar-track { background: #f1f5f9; }
        .dashboard-shell::-webkit-scrollbar-thumb { background: #86efac; border-radius: 3px; }
        .dashboard-section-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          border-left: 4px solid #16a34a;
          padding-left: 12px;
          line-height: 1.2;
        }
        .dashboard-reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .dashboard-reveal.is-visible { opacity: 1; transform: translateY(0); }
        .dashboard-stat-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .dashboard-stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08); }
        .dashboard-icon-circle {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .dashboard-feature-card {
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.25s ease;
        }
        .dashboard-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
          border-color: #86efac;
        }
        .dashboard-feature-card-orange:hover {
          border-color: #fed7aa;
        }
        .profile-streak-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dashboard-quiz-feature {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          animation: dashboardQuizEntrance 0.5s ease-out both;
        }
        .dashboard-quiz-mockup {
          animation: quizFloat 3s ease-in-out infinite;
        }
        .dashboard-quick-start {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .dashboard-subject-card:hover .dashboard-quick-start {
          transform: translateY(-1px);
        }
        .dashboard-mode-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes quizFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes dashboardQuizEntrance {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 767px) {
          .profile-streak-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .profile-card { order: 1; width: 100%; }
          .streak-widget { order: 2; width: 100%; }
          .badge-row { order: 3; width: 100%; }
          .dashboard-icon-circle {
            width: 36px;
            height: 36px;
          }
          .dashboard-mode-icon {
            width: 52px;
            height: 52px;
          }
          .dashboard-quick-start {
            opacity: 1;
          }
        }
        @media (max-width: 414px) {
          .dashboard-section-title {
            font-size: 16px;
            padding-left: 10px;
          }
          .dashboard-stat-card {
            border-radius: 14px;
          }
          .dashboard-stat-card > div {
            padding: 14px !important;
          }
          .dashboard-stat-card p.font-black {
            font-size: 20px !important;
            line-height: 1.2;
          }
          .profile-card > div,
          .streak-widget > div,
          .badge-row > div {
            padding: 14px !important;
          }
          .badge-row .grid {
            gap: 8px;
          }
          .dashboard-quiz-feature > div {
            padding: 18px !important;
          }
          .dashboard-quiz-feature h3 {
            font-size: 1.15rem;
          }
          .dashboard-feature-card {
            border-radius: 16px;
          }
          .dashboard-feature-card > div {
            padding: 16px !important;
          }
          .dashboard-feature-card button {
            min-height: 38px;
          }
          #continue-learning .rounded-2xl > div {
            padding: 14px !important;
          }
          #continue-learning .mt-4.grid.grid-cols-2 {
            gap: 8px;
          }
          #continue-learning button {
            min-height: 36px;
            font-size: 11px;
          }
          .dashboard-shell .fixed.bottom-0 button {
            height: 44px;
          }
        }
        @media (max-width: 375px) {
          .dashboard-section-title {
            font-size: 15px;
          }
          .dashboard-icon-circle {
            width: 34px;
            height: 34px;
          }
          .dashboard-mode-icon {
            width: 48px;
            height: 48px;
          }
          .dashboard-stat-card p.font-black {
            font-size: 18px !important;
          }
          .dashboard-quiz-feature > div {
            padding: 16px !important;
          }
        }
        @media (min-width: 768px) {
          .dashboard-quick-start {
            opacity: 1;
            pointer-events: auto;
          }
          .dashboard-subject-card:hover .dashboard-quick-start,
          .dashboard-subject-card:focus-within .dashboard-quick-start {
            opacity: 1;
            pointer-events: auto;
          }
        }
        .dashboard-second-tick { animation: dashboardTick 1s ease-in-out infinite; }
        .dashboard-streak-pulse { animation: dashboardPulse 2s ease-in-out infinite; }
        @keyframes dashboardTick {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes dashboardPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.15); }
          50% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
        }
        .badge-pop {
          animation: badgePop 0.55s cubic-bezier(.175,.885,.32,1.275) both;
        }
        .badge-confetti {
          position: absolute;
          top: -10px;
          width: 6px;
          height: 14px;
          border-radius: 999px;
          background: rgba(22, 163, 74, 0.28);
          animation: badgeConfetti 1.9s ease-in-out infinite;
        }
        @keyframes badgePop {
          0% { opacity: 0; transform: scale(0.5); }
          70% { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes badgeConfetti {
          0% { opacity: 0; transform: translateY(0) rotate(0deg); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translateY(260px) rotate(180deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-reveal, .dashboard-stat-card, .dashboard-feature-card, .dashboard-second-tick, .dashboard-streak-pulse, .badge-pop, .badge-confetti, .dashboard-quiz-feature, .dashboard-quiz-mockup, .dashboard-quick-start {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </main>
  )
}


