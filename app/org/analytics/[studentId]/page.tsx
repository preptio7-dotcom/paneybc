'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Target, BookOpen, Flame } from 'lucide-react'

type StudentAnalytics = {
  org: { id: string; name: string }
  student: { id: string; name: string | null; email: string | null; studentRole: string | null }
  range: string
  analytics: {
    topStats: {
      totalQuestionsPracticed: number
      overallAccuracy: number
      streak: { current: number; best: number }
      examReadiness: { score: number }
    }
    readiness: {
      interpretation: { title: string; message: string }
      factors: Array<{ key: string; label: string; points: number; maxPoints: number }>
    }
    subjects: Array<{
      code: string
      name: string
      attempted: number
      accuracy: number
      totalQuestions: number
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
        }>
      }>
    }
  }
}

export default function OrgStudentAnalyticsPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const searchParams = useSearchParams()
  const [range, setRange] = useState(searchParams.get('range') || '30d')
  const [data, setData] = useState<StudentAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetch(`/api/org/analytics/${studentId}?range=${range}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load student analytics')
        return d as StudentAnalytics
      })
      .then((d) => {
        setData(d)
        setSelectedTab(d.analytics.heatmap.tabs[0]?.code || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [studentId, range])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary-green" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-red-500 font-medium">{error}</p>
        <Link href="/org/analytics" className="text-sm text-primary-green hover:underline">
          ← Back to institute analytics
        </Link>
      </div>
    )
  }

  if (!data) return null

  const stats = data.analytics.topStats
  const currentHeatmapTab = data.analytics.heatmap.tabs.find((tab) => tab.code === selectedTab)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/org/analytics" className="inline-flex items-center gap-1 text-sm text-text-light hover:text-text-dark mb-2">
            <ArrowLeft size={14} />
            Institute analytics
          </Link>
          <h2 className="text-2xl font-bold text-text-dark">{data.student.name || 'Unnamed student'}</h2>
          <p className="text-sm text-text-light">
            {data.student.email || 'No email'} {data.student.studentRole ? `· ${data.student.studentRole}` : ''}
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="h-9 rounded-md border border-border-light bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green/30 w-fit"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border-light shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Questions</p>
                <p className="text-2xl font-bold text-text-dark">{stats.totalQuestionsPracticed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border-light shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Target size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Accuracy</p>
                <p className="text-2xl font-bold text-text-dark">{Math.round(stats.overallAccuracy)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border-light shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Flame size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Streak</p>
                <p className="text-2xl font-bold text-text-dark">{stats.streak.current}d</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border-light shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-text-light">Exam readiness</p>
            <p className="text-2xl font-bold text-text-dark">{stats.examReadiness.score}%</p>
            <p className="text-xs text-text-light mt-1">{data.analytics.readiness.interpretation.title}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border-light shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Subject Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.analytics.subjects.length === 0 ? (
            <p className="text-sm text-text-light text-center py-6">No subject attempts in this range.</p>
          ) : (
            <div className="divide-y divide-border-light">
              {data.analytics.subjects.map((subj) => (
                <div key={subj.code} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-text-dark">{subj.name}</p>
                    <p className="text-xs text-text-light">
                      {subj.attempted.toLocaleString()} / {subj.totalQuestions.toLocaleString()} attempted
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold ${
                      subj.accuracy >= 70 ? 'text-green-600' : subj.accuracy >= 50 ? 'text-amber-600' : 'text-red-500'
                    }`}
                  >
                    {Math.round(subj.accuracy)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border-light shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Chapter heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.analytics.heatmap.tabs.map((tab) => (
              <button
                key={tab.code}
                type="button"
                onClick={() => setSelectedTab(tab.code)}
                className={`px-3 py-1.5 rounded-full border text-xs ${
                  currentHeatmapTab?.code === tab.code
                    ? 'bg-primary-green text-white border-primary-green'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {tab.code}
              </button>
            ))}
          </div>
          {currentHeatmapTab ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 mt-4">
              {currentHeatmapTab.chapters.map((chapter) => (
                <div
                  key={chapter.key}
                  className={`rounded-lg border p-2 ${
                    chapter.status === 'strong'
                      ? 'bg-emerald-100 border-emerald-200'
                      : chapter.status === 'improving'
                        ? 'bg-amber-100 border-amber-200'
                        : chapter.status === 'needs_work'
                          ? 'bg-rose-100 border-rose-200'
                          : 'bg-slate-50 border-slate-200 border-dashed'
                  }`}
                >
                  <p className="text-[11px] line-clamp-2 font-semibold">{chapter.label}</p>
                  <p className="text-base font-black mt-1">
                    {chapter.accuracy === null ? '--' : `${Math.round(chapter.accuracy)}%`}
                  </p>
                  <p className="text-[10px]">{chapter.attempted} attempts</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-light text-center py-6 mt-4">No chapter data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
