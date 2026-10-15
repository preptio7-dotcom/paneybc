'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart2,
  BookOpen,
  Loader2,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

type SubjectAgg = {
  code: string
  name: string
  questionsAttempted: number
  accuracy: number
}

type MemberBreakdown = {
  userId: string
  name: string | null
  email: string | null
  studentRole: string | null
  totalQuestioned: number
  accuracy: number
  currentStreak: number
}

type AnalyticsData = {
  org: { id: string; name: string }
  memberCount: number
  analyzedCount: number
  range: string
  analytics: {
    totalQuestioned: number
    avgAccuracy: number
    subjects: SubjectAgg[]
  } | null
  memberBreakdown: MemberBreakdown[]
}

export default function OrgAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [range, setRange] = useState('30d')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetch(`/api/org/analytics?range=${range}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json()
          throw new Error(d.error || 'Failed to load analytics')
        }
        return r.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [range])

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
        <p className="text-sm text-text-light">
          Only organization admins and owners can view analytics.
        </p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
            <BarChart2 size={22} className="text-primary-green" />
            Institute Analytics
          </h2>
          <p className="text-sm text-text-light">
            {data.org.name} · {data.memberCount} member{data.memberCount !== 1 ? 's' : ''}
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

      {!data.analytics ? (
        <div className="text-center py-16 text-text-light">
          <BarChart2 size={48} className="mx-auto mb-3 text-slate-200" />
          <p>No analytics data yet. Members need to start practicing!</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border-light shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BookOpen size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-text-light">Total Questions</p>
                    <p className="text-2xl font-bold text-text-dark">
                      {(data.analytics.totalQuestioned ?? 0).toLocaleString()}
                    </p>
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
                    <p className="text-sm text-text-light">Avg. Accuracy</p>
                    <p className="text-2xl font-bold text-text-dark">
                      {data.analytics.avgAccuracy ?? 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border-light shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Users size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-text-light">Active Members</p>
                    <p className="text-2xl font-bold text-text-dark">
                      {(data.memberBreakdown ?? []).filter((m) => (m.totalQuestioned ?? 0) > 0).length}
                      <span className="text-sm font-normal text-text-light"> / {data.memberCount ?? 0}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject breakdown */}
          {(data.analytics.subjects ?? []).length > 0 && (
            <Card className="border-border-light shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border-light">
                  {(data.analytics.subjects ?? []).map((subj) => (
                    <div key={subj.code} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-text-dark">{subj.name}</p>
                        <p className="text-xs text-text-light">
                          {(subj.questionsAttempted ?? 0).toLocaleString()} questions attempted
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            subj.accuracy >= 70
                              ? 'text-green-600'
                              : subj.accuracy >= 50
                              ? 'text-amber-600'
                              : 'text-red-500'
                          }`}
                        >
                          {subj.accuracy}%
                        </p>
                        <p className="text-xs text-text-light">accuracy</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Member leaderboard */}
          <Card className="border-border-light shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp size={18} />
                Member Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.memberBreakdown.length === 0 ? (
                <p className="text-sm text-text-light text-center py-6">No data yet.</p>
              ) : (
                <div className="divide-y divide-border-light">
                  {[...data.memberBreakdown]
                    .sort((a, b) => b.totalQuestioned - a.totalQuestioned)
                    .map((m, i) => (
                      <Link
                        key={m.userId}
                        href={`/org/analytics/${m.userId}?range=${range}`}
                        className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0
                                ? 'bg-amber-100 text-amber-700'
                                : i === 1
                                ? 'bg-slate-100 text-slate-600'
                                : i === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-text-dark">
                              {m.name || 'Unnamed'}
                            </p>
                            <p className="text-xs text-text-light">
                              {m.studentRole ? `${m.studentRole} · ` : ''}View analytics
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          {m.currentStreak > 0 && (
                            <span className="text-xs text-amber-600">🔥 {m.currentStreak}</span>
                          )}
                          <div>
                            <p className="text-sm font-bold text-text-dark">
                              {(m.totalQuestioned ?? 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-light">questions</p>
                          </div>
                          <div>
                            <p
                              className={`text-sm font-bold ${
                                (m.accuracy ?? 0) >= 70
                                  ? 'text-green-600'
                                  : (m.accuracy ?? 0) >= 50
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                              }`}
                            >
                              {Math.round(m.accuracy ?? 0)}%
                            </p>
                            <p className="text-xs text-text-light">accuracy</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
