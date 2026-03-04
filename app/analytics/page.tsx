'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type RangeKey = '7d' | '30d' | '90d' | 'all'
type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'
type Recommendation = {
  priority: RecommendationPriority
  type: string
  title: string
  description: string
  action: string
  actionLink: string
  dataPoint: string
}
type DeepAnalytics = {
  topStats: {
    totalQuestionsPracticed: number
    totalQuestionsTrend: number | null
    overallAccuracy: number
    overallAccuracyTrend: number | null
    streak: { current: number; best: number }
    examReadiness: { score: number; trend: number | null }
  }
  readiness: {
    score: number
    factors: Array<{ key: string; label: string; points: number; maxPoints: number }>
    interpretation: { tone: 'red' | 'amber' | 'green' | 'blue'; title: string; message: string }
  }
  accuracyTrend: {
    points: Array<{ label: string; userAccuracy: number | null; platformAccuracy: number | null }>
    insight: { message: string; tone: 'green' | 'amber' | 'slate' }
  }
  subjects: Array<{
    code: string
    name: string
    totalQuestions: number
    attempted: number
    accuracy: number
    trend: 'up' | 'down' | 'flat'
    averageTimePerQuestion: number
    platformAverageAccuracy: number | null
    lastPracticed: string | null
    progressPercent: number
  }>
  heatmap: {
    tabs: Array<{
      code: string
      chapters: Array<{
        key: string
        label: string
        attempted: number
        accuracy: number | null
        status: 'not_attempted' | 'needs_work' | 'improving' | 'strong'
        practiceLink: string
      }>
    }>
  }
  timeAnalysis: {
    averageTimePerQuestion: number
    platformAverageTimePerQuestion: number | null
    distribution: Array<{ bucket: string; count: number }>
    insight: string
  }
  comparison: {
    metrics: Array<{ key: string; label: string; you: string; platform: string; trend: 'above' | 'below' | 'equal' }>
    percentileTop: number | null
  }
  mockHistory: {
    foa: Array<{
      id: string
      date: string
      scorePercent: number
      scoreText: string
      weakestChapter: string | null
      weakestChapterLabel: string | null
      weakestAccuracy: number | null
      timeAllowed: number
      timeTaken: number
      improvementDelta: number
    }>
    qafb: Array<{
      id: string
      date: string
      scorePercent: number
      scoreText: string
      weakestChapter: string | null
      weakestChapterLabel: string | null
      weakestAccuracy: number | null
      timeAllowed: number
      timeTaken: number
      improvementDelta: number
    }>
  }
}

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 3 months' },
  { key: 'all', label: 'All time' },
]

function formatDelta(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) return '--'
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`
}

function buildSparklinePath(values: number[]) {
  if (values.length < 2) return ''
  const width = 260
  const height = 80
  const left = 8
  const right = 8
  const top = 8
  const bottom = 8
  const usableWidth = width - left - right
  const usableHeight = height - top - bottom

  return values
    .map((value, index) => {
      const x = left + (index / Math.max(1, values.length - 1)) * usableWidth
      const y = top + ((100 - Math.max(0, Math.min(100, value))) / 100) * usableHeight
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function priorityTheme(priority: RecommendationPriority) {
  if (priority === 'critical') return 'border-l-red-500 bg-red-50'
  if (priority === 'high') return 'border-l-amber-500 bg-amber-50'
  if (priority === 'medium') return 'border-l-blue-500 bg-blue-50'
  return 'border-l-emerald-500 bg-emerald-50'
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [authToastShown, setAuthToastShown] = useState(false)
  const [range, setRange] = useState<RangeKey>('all')
  const [analytics, setAnalytics] = useState<DeepAnalytics | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const [featureBlocked, setFeatureBlocked] = useState<string | null>(null)
  const [recommendationNotice, setRecommendationNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({ title: 'Login required', description: 'Please log in to view analytics.', variant: 'destructive' })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  useEffect(() => {
    if (authLoading || !user?.id) return
    void loadData()
  }, [authLoading, user?.id, range])

  useEffect(() => {
    if (!analytics?.heatmap.tabs.length) {
      setSelectedTab(null)
      return
    }
    if (!selectedTab || !analytics.heatmap.tabs.some((tab) => tab.code === selectedTab)) {
      setSelectedTab(analytics.heatmap.tabs[0].code)
    }
  }, [analytics?.heatmap.tabs, selectedTab])

  async function loadData() {
    try {
      setIsLoading(true)
      setError(null)
      setFeatureBlocked(null)
      setRecommendationNotice(null)

      const [analyticsRes, recRes] = await Promise.all([
        fetch(`/api/analytics/deep?range=${range}`, { cache: 'no-store' }),
        fetch(`/api/analytics/recommendations?range=${range}`, { cache: 'no-store' }),
      ])

      if (analyticsRes.status === 403 || recRes.status === 403) {
        const payload = await (analyticsRes.status === 403 ? analyticsRes.json() : recRes.json())
        setFeatureBlocked(payload?.error || 'This feature is currently beta-only.')
        setAnalytics(null)
        setRecommendations([])
        return
      }

      if (!analyticsRes.ok) {
        throw new Error('Failed to load analytics')
      }

      const analyticsPayload = await analyticsRes.json()
      setAnalytics(analyticsPayload?.analytics || null)

      if (recRes.ok) {
        const recPayload = await recRes.json()
        setRecommendations(Array.isArray(recPayload?.recommendations) ? recPayload.recommendations : [])
        if (recPayload?.notEnoughData) {
          setRecommendationNotice(
            `Complete at least ${recPayload.minimumRequiredQuestions || 10} questions to unlock recommendations.`
          )
        }
      } else {
        setRecommendations([])
      }
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load analytics')
      setAnalytics(null)
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }

  const ring = useMemo(() => {
    const score = analytics?.readiness.score || 0
    const radius = 66
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference
    const color = score <= 40 ? '#ef4444' : score <= 60 ? '#f59e0b' : score <= 80 ? '#16a34a' : '#0ea5e9'
    return { score, radius, circumference, offset, color }
  }, [analytics?.readiness.score])

  const currentHeatmapTab = useMemo(() => {
    if (!analytics?.heatmap.tabs.length) return null
    return analytics.heatmap.tabs.find((tab) => tab.code === selectedTab) || analytics.heatmap.tabs[0]
  }, [analytics?.heatmap.tabs, selectedTab])

  const foaTrendPath = useMemo(() => {
    const scores = (analytics?.mockHistory.foa || []).slice().reverse().map((row) => row.scorePercent)
    return buildSparklinePath(scores)
  }, [analytics?.mockHistory.foa])

  const qafbTrendPath = useMemo(() => {
    const scores = (analytics?.mockHistory.qafb || []).slice().reverse().map((row) => row.scorePercent)
    return buildSparklinePath(scores)
  }, [analytics?.mockHistory.qafb])

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary-green border-t-transparent animate-spin" /></div>
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-slate-200">
          <CardContent className="p-8 text-center space-y-4">
            <p className="font-semibold text-slate-900">Login required</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.assign('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => window.location.assign('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navigation />
      <main className="pt-[82px] pb-14">
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl bg-[linear-gradient(135deg,#0f172a,#1e3a5f)] p-6 text-white flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">My Performance Analytics</h1>
              <p className="text-sm text-white/75 mt-1">Track your progress and identify where to focus.</p>
            </div>
            <select
              className="w-full md:w-[220px] rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
              value={range}
              onChange={(event) => setRange(event.target.value as RangeKey)}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key} className="text-slate-900">{opt.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6 space-y-6">
          {featureBlocked ? (
            <Card className="border-slate-200">
              <CardContent className="p-8 text-center space-y-3">
                <p className="font-semibold text-slate-900">Beta Access Required</p>
                <p className="text-sm text-slate-600">{featureBlocked}</p>
                <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
              </CardContent>
            </Card>
          ) : null}

          {error && !featureBlocked ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}

          {!featureBlocked && analytics ? (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase">Questions</p><p className="text-2xl font-black">{analytics.topStats.totalQuestionsPracticed}</p><p className="text-xs text-slate-500">{formatDelta(analytics.topStats.totalQuestionsTrend)} vs previous</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase">Accuracy</p><p className="text-2xl font-black">{Math.round(analytics.topStats.overallAccuracy)}%</p><p className="text-xs text-slate-500">{formatDelta(analytics.topStats.overallAccuracyTrend, '%')}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase">Streak</p><p className="text-2xl font-black">{analytics.topStats.streak.current}d</p><p className="text-xs text-slate-500">Best {analytics.topStats.streak.best}d</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase">Readiness</p><p className="text-2xl font-black">{analytics.topStats.examReadiness.score}%</p><p className="text-xs text-slate-500">{formatDelta(analytics.topStats.examReadiness.trend)}</p></CardContent></Card>
              </div>

              <Card>
                <CardContent className="p-5 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-center">
                  <div className="relative h-[170px] w-[170px] mx-auto">
                    <svg width="170" height="170" className="-rotate-90">
                      <circle cx="85" cy="85" r={ring.radius} stroke="#e2e8f0" strokeWidth="12" fill="none" />
                      <circle cx="85" cy="85" r={ring.radius} stroke={ring.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={ring.circumference} strokeDashoffset={ring.offset} fill="none" className="transition-all duration-[1500ms] ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-3xl font-black">{ring.score}%</p><p className="text-xs text-slate-500">Exam Ready</p></div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Exam Readiness Score</h2>
                    <div className="mt-3 space-y-2">
                      {analytics.readiness.factors.map((f) => (
                        <div key={f.key} className="grid grid-cols-[160px_1fr_60px] gap-3 items-center text-xs">
                          <span>{f.label}</span>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary-green" style={{ width: `${Math.min(100, (f.points / f.maxPoints) * 100)}%` }} /></div>
                          <span className="text-right text-slate-500">{Math.round(f.points)}/{f.maxPoints}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-600">{analytics.readiness.interpretation.message}</p>
                  </div>
                </CardContent>
              </Card>

              <Card><CardContent className="p-5"><h2 className="text-lg font-bold">Your Accuracy Over Time</h2><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.accuracyTrend.points}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" /><YAxis domain={[0,100]} /><Tooltip /><ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 4" /><Line type="monotone" dataKey="platformAccuracy" stroke="#94a3b8" strokeDasharray="5 5" dot={false} /><Area type="monotone" dataKey="userAccuracy" stroke="none" fill="rgba(22,163,74,0.12)" /><Line type="monotone" dataKey="userAccuracy" stroke="#16a34a" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div><p className="mt-3 text-sm text-slate-600">{analytics.accuracyTrend.insight.message}</p></CardContent></Card>

              <Card><CardContent className="p-5"><h2 className="text-lg font-bold">Performance by Subject</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">{analytics.subjects.map((s)=> (<div key={s.code} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between"><p className="font-semibold">{s.code}</p><span className="text-xs text-slate-500">{s.trend}</span></div><p className="text-sm text-slate-600 mt-1">{s.name}</p><p className="text-sm mt-2">{s.attempted}/{s.totalQuestions} attempted - {Math.round(s.accuracy)}%</p><p className="text-xs text-slate-500 mt-1">Avg time {Math.round(s.averageTimePerQuestion)}s - last {s.lastPracticed ? new Date(s.lastPracticed).toLocaleDateString() : 'Never'}</p><div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-primary-green" style={{ width: `${s.progressPercent}%` }} /></div></div>))}</div></CardContent></Card>

              <Card><CardContent className="p-5"><h2 className="text-lg font-bold">Chapter Performance Heatmap</h2><div className="flex flex-wrap gap-2 mt-4">{analytics.heatmap.tabs.map((tab)=><button key={tab.code} className={`px-3 py-1.5 rounded-full border text-xs ${currentHeatmapTab?.code===tab.code ? 'bg-primary-green text-white border-primary-green':'bg-white border-slate-200 text-slate-600'}`} onClick={()=>setSelectedTab(tab.code)}>{tab.code}</button>)}</div>{currentHeatmapTab ? <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 mt-4">{currentHeatmapTab.chapters.map((c)=> (<Link key={c.key} href={c.practiceLink}><div className={`rounded-lg border p-2 ${c.status==='strong'?'bg-emerald-100 border-emerald-200':c.status==='improving'?'bg-amber-100 border-amber-200':c.status==='needs_work'?'bg-rose-100 border-rose-200':'bg-slate-50 border-slate-200 border-dashed'}`}><p className="text-[11px] line-clamp-2 font-semibold">{c.label}</p><p className="text-base font-black mt-1">{c.accuracy===null?'--':`${Math.round(c.accuracy)}%`}</p><p className="text-[10px]">{c.attempted} attempts</p></div></Link>))}</div> : null}</CardContent></Card>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-lg font-bold">How Fast Are You?</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Average: {Math.round(analytics.timeAnalysis.averageTimePerQuestion)}s · Platform:{' '}
                      {analytics.timeAnalysis.platformAverageTimePerQuestion === null
                        ? '--'
                        : `${Math.round(analytics.timeAnalysis.platformAverageTimePerQuestion)}s`}
                    </p>
                    <div className="h-56 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.timeAnalysis.distribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="bucket" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{analytics.timeAnalysis.insight}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-lg font-bold">How Do You Compare?</h2>
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full min-w-[420px] text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-1">Metric</th>
                            <th className="py-1">You</th>
                            <th className="py-1">Platform</th>
                            <th className="py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.comparison.metrics.map((m) => (
                            <tr key={m.key} className="border-t border-slate-100">
                              <td className="py-1.5">{m.label}</td>
                              <td className="py-1.5 font-semibold">{m.you}</td>
                              <td className="py-1.5">{m.platform}</td>
                              <td
                                className={`py-1.5 text-xs font-semibold ${
                                  m.trend === 'above'
                                    ? 'text-emerald-700'
                                    : m.trend === 'below'
                                      ? 'text-rose-700'
                                      : 'text-slate-500'
                                }`}
                              >
                                {m.trend}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-slate-600 mt-3">
                      {analytics.comparison.percentileTop === null
                        ? 'Not enough percentile data yet.'
                        : `You are in top ${analytics.comparison.percentileTop}% of active students.`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-lg font-bold">FOA Mock Test History</h2>
                    {analytics.mockHistory.foa.length ? (
                      <>
                        {foaTrendPath ? (
                          <div className="mt-3 rounded-xl border border-[#ddd6fe] bg-[#f5f3ff] p-3">
                            <p className="text-xs text-[#6d28d9] mb-2">Accuracy trend</p>
                            <svg viewBox="0 0 260 80" className="h-20 w-full">
                              <path d={foaTrendPath} fill="none" stroke="#7c3aed" strokeWidth="2.5" />
                            </svg>
                          </div>
                        ) : null}
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[560px] text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-left text-slate-500">
                                <th className="pb-2 pr-3">Date</th>
                                <th className="pb-2 pr-3">Score</th>
                                <th className="pb-2 pr-3">Weakest</th>
                                <th className="pb-2 pr-3">Time</th>
                                <th className="pb-2">Change</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.mockHistory.foa.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                                  <td className="py-2 pr-3">{new Date(row.date).toLocaleDateString()}</td>
                                  <td className="py-2 pr-3">
                                    {row.scoreText} ({row.scorePercent}%)
                                  </td>
                                  <td className="py-2 pr-3">
                                    {row.weakestChapter
                                      ? `${row.weakestChapterLabel || row.weakestChapter}${
                                          row.weakestAccuracy === null ? '' : ` (${row.weakestAccuracy}%)`
                                        }`
                                      : '--'}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {Math.round((row.timeTaken / Math.max(1, row.timeAllowed * 60)) * 100)}%
                                  </td>
                                  <td
                                    className={`py-2 font-semibold ${
                                      row.improvementDelta > 0
                                        ? 'text-emerald-600'
                                        : row.improvementDelta < 0
                                          ? 'text-rose-600'
                                          : 'text-slate-500'
                                    }`}
                                  >
                                    {row.improvementDelta > 0
                                      ? `+${row.improvementDelta}%`
                                      : `${row.improvementDelta}%`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">No FOA mock attempts yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-lg font-bold">QAFB Mock Test History</h2>
                    {analytics.mockHistory.qafb.length ? (
                      <>
                        {qafbTrendPath ? (
                          <div className="mt-3 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3">
                            <p className="text-xs text-[#c2410c] mb-2">Accuracy trend</p>
                            <svg viewBox="0 0 260 80" className="h-20 w-full">
                              <path d={qafbTrendPath} fill="none" stroke="#ea580c" strokeWidth="2.5" />
                            </svg>
                          </div>
                        ) : null}
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[560px] text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-left text-slate-500">
                                <th className="pb-2 pr-3">Date</th>
                                <th className="pb-2 pr-3">Score</th>
                                <th className="pb-2 pr-3">Weakest</th>
                                <th className="pb-2 pr-3">Time</th>
                                <th className="pb-2">Change</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.mockHistory.qafb.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                                  <td className="py-2 pr-3">{new Date(row.date).toLocaleDateString()}</td>
                                  <td className="py-2 pr-3">
                                    {row.scoreText} ({row.scorePercent}%)
                                  </td>
                                  <td className="py-2 pr-3">
                                    {row.weakestChapter
                                      ? `${row.weakestChapterLabel || row.weakestChapter}${
                                          row.weakestAccuracy === null ? '' : ` (${row.weakestAccuracy}%)`
                                        }`
                                      : '--'}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {Math.round((row.timeTaken / Math.max(1, row.timeAllowed * 60)) * 100)}%
                                  </td>
                                  <td
                                    className={`py-2 font-semibold ${
                                      row.improvementDelta > 0
                                        ? 'text-emerald-600'
                                        : row.improvementDelta < 0
                                          ? 'text-rose-600'
                                          : 'text-slate-500'
                                    }`}
                                  >
                                    {row.improvementDelta > 0
                                      ? `+${row.improvementDelta}%`
                                      : `${row.improvementDelta}%`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">No QAFB mock attempts yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card id="study-recommendations">
                <CardContent className="p-5">
                  <h2 className="text-lg font-bold">Your Study Recommendations</h2>
                  {recommendationNotice ? <p className="text-sm text-amber-700 mt-2">{recommendationNotice}</p> : null}
                  {recommendations.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {recommendations.map((r, i) => (
                        <div key={`${r.type}-${i}`} className={`rounded-xl border border-slate-200 border-l-4 p-3 ${priorityTheme(r.priority)}`}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">{r.title}</p>
                            <span className="text-[11px] uppercase tracking-wide text-slate-600">{r.priority}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{r.description}</p>
                          <div className="mt-2 flex flex-wrap justify-between gap-2 items-center">
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-500">{r.dataPoint}</span>
                            <Link href={r.actionLink}><Button size="sm" variant="outline">{r.action}</Button></Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 mt-3">{isLoading ? 'Loading recommendations...' : 'No recommendations yet.'}</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}

          {isLoading && !featureBlocked ? (
            <div className="space-y-3">
              {[0, 1, 2].map((idx) => <div key={idx} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

