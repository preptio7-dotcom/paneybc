'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle,
  Clock3,
  ClipboardList,
  Flame,
  Loader2,
  RefreshCw,
  Users,
  UserPlus,
} from 'lucide-react'
import { InstituteAnalyticsChart } from '@/components/admin/institute-chart'

type AdminRangePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'all' | 'custom'
type ActivityMode = 'dau' | 'wau' | 'mau'

type KpiCard = {
  label: string
  value: number
  valueText: string
  subtext: string
  trendDirection: 'up' | 'down' | 'flat'
  trendText: string
}

type ReportPayload = {
  heavy: {
    generatedAt: string
    range: {
      preset: AdminRangePreset
      label: string
      from: string
      to: string
      startInput: string
      endInput: string
    }
    kpis: {
      activeUsers: KpiCard
      newSignups: KpiCard
      questionsAnswered: KpiCard
      mockTestsCompleted: KpiCard
      averageSessionLength: KpiCard
      streakLeader: KpiCard
    }
    activeUsersChart: {
      points: Array<{
        dayKey: string
        label: string
        dau: number
        wau: number
        mau: number
        newSignups: number
      }>
      pills: {
        today: number
        yesterday: number
        peak: { dayKey: string; count: number }
      }
    }
    retention: {
      cohorts: Array<{ weekLabel: string; d1: number | null; d7: number | null; d30: number | null }>
      summary: {
        day1: number
        day7: number
        day30: number
        atRiskCount: number
      }
    }
    subjectPerformance: {
      usage: Array<{
        subjectCode: string
        subjectName: string
        color: string
        attempts: number
        accuracy: number
      }>
      insights: {
        mostPracticed: string
        highestAccuracy: string
        needsAttention: string
      }
    }
    peakUsage: {
      cells: Array<{ day: number; hour: number; count: number }>
      insights: {
        peakTimeLabel: string
        peakTimeCount: number
        mostActiveDay: string
        nightOwlPercent: number
        earlyBirdPercent: number
      }
    }
    signupSources: {
      total: number
      rows: Array<{ source: string; count: number; percent: number }>
      insight: string
    }
    deviceUsage: {
      mobile: number
      desktop: number
      tablet: number
      browsers: Array<{ browser: string; percent: number }>
      insight: string
    }
    mockAnalytics: {
      rows: Array<{
        testType: 'bae_mock' | 'foa_mock' | 'qafb_mock'
        label: string
        attempts: number
        completed: number
        passRate: number
        avgScore: number
      }>
      trend: Array<{ dayKey: string; bae: number; foa: number; qafb: number }>
      insights: string[]
    }
    geography: {
      rows: Array<{
        rank: number
        city: string
        students: number
        percent: number
        medal: 'gold' | 'silver' | 'bronze' | null
      }>
      insight: string
    }
    adsense: {
      manual: {
        thisMonthPkr: number
        lastMonthPkr: number
        history: Array<{ monthKey: string; valuePkr: number }>
        updatedAt: string | null
      }
      estimate: {
        rpmUsd: number
        pageViews: number
        estimatedUsd: number
      }
    }
    platformStatsJob: {
      status: 'success' | 'failed' | null
      runAt: string | null
      error: string | null
    }
  }
  leaderboard: {
    current: Array<{
      rank: number
      userId: string
      displayName: string
      streak: number
      subjects: string
      accuracy: number
    }>
    best: Array<{
      rank: number
      userId: string
      displayName: string
      streak: number
      subjects: string
      accuracy: number
    }>
    distribution: Array<{ label: string; percent: number; count: number }>
  }
  liveActivity: {
    events: Array<{
      id: string
      icon: string
      message: string
      subtext: string
      timestamp: string
      timestampLabel: string
    }>
    refreshedAt: string
  }
}

const PRESET_OPTIONS: Array<{ key: AdminRangePreset; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
]

const SOURCE_COLORS: Record<string, string> = {
  direct: '#3b82f6',
  google: '#16a34a',
  whatsapp: '#14b8a6',
  instagram: '#7c3aed',
  facebook: '#4f46e5',
  other: '#64748b',
}

const KPI_META = [
  { key: 'activeUsers', icon: Users, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { key: 'newSignups', icon: UserPlus, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { key: 'questionsAnswered', icon: CheckCircle, bg: 'bg-violet-50', iconColor: 'text-violet-600' },
  { key: 'mockTestsCompleted', icon: ClipboardList, bg: 'bg-orange-50', iconColor: 'text-orange-600' },
  { key: 'averageSessionLength', icon: Clock3, bg: 'bg-teal-50', iconColor: 'text-teal-600' },
  { key: 'streakLeader', icon: Flame, bg: 'bg-rose-50', iconColor: 'text-rose-600' },
] as const

function formatDate(value: string | null) {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed)
}

function formatShortDate(value: string) {
  if (!value) return ''
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function medalIcon(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}`
}

function sourceLabel(source: string) {
  if (source === 'direct') return 'Direct'
  if (source === 'google') return 'Google Search'
  if (source === 'whatsapp') return 'WhatsApp'
  if (source === 'instagram') return 'Instagram'
  if (source === 'facebook') return 'Facebook'
  return 'Other'
}

function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      setValue(Math.round(target * progress))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="border-l-4 border-[#16a34a] pl-3 text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function KpiCardView({
  card,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  card: KpiCard
  icon: any
  iconBg: string
  iconColor: string
}) {
  const count = useCountUp(card.value, 1200)
  const isMinutes = card.valueText.includes('min')
  const isDays = card.valueText.includes('days')
  const display = isMinutes ? `${count} min` : isDays ? `${count} days` : count.toLocaleString()
  const trendColor =
    card.trendDirection === 'up'
      ? 'text-emerald-600'
      : card.trendDirection === 'down'
        ? 'text-rose-600'
        : 'text-slate-500'

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`${iconColor}`} size={18} />
        </div>
        <div className={`inline-flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          {card.trendDirection === 'up' ? <ArrowUp size={12} /> : card.trendDirection === 'down' ? <ArrowDown size={12} /> : null}
          <span>{card.trendDirection === 'flat' ? '--' : card.trendDirection === 'up' ? 'Up' : 'Down'}</span>
        </div>
      </div>
      <p className="admin-kpi-value mt-4 text-2xl font-black text-slate-900 md:text-3xl">{display}</p>
      <p className="admin-kpi-label mt-1 text-sm font-semibold text-slate-700">{card.label}</p>
      <p className="mt-2 text-xs text-slate-500">{card.subtext}</p>
    </div>
  )
}

function HeatmapCellColor(count: number, maxCount: number) {
  if (maxCount <= 0 || count <= 0) return '#f0fdf4'
  const ratio = count / maxCount
  if (ratio >= 0.85) return '#15803d'
  if (ratio >= 0.6) return '#22c55e'
  if (ratio >= 0.35) return '#86efac'
  return '#dcfce7'
}

function RetentionRing({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-3 flex items-center gap-4">
        <div
          className="relative h-16 w-16 rounded-full"
          style={{
            background: `conic-gradient(${color} ${value}%, #e2e8f0 ${value}% 100%)`,
          }}
        >
          <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900">
            {value.toFixed(0)}%
          </div>
        </div>
        <p className="text-xs text-slate-500">of new students return within {label.toLowerCase().replace('retention', '')}</p>
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [preset, setPreset] = useState<AdminRangePreset>('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activityMode, setActivityMode] = useState<ActivityMode>('dau')
  const [leaderboardMode, setLeaderboardMode] = useState<'current' | 'best'>('current')
  const [report, setReport] = useState<ReportPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isSavingAdsense, setIsSavingAdsense] = useState(false)
  const [adsenseThisMonth, setAdsenseThisMonth] = useState('')
  const [adsenseLastMonth, setAdsenseLastMonth] = useState('')
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  useEffect(() => {
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < 768)
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => {
      window.removeEventListener('resize', syncViewport)
    }
  }, [])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('preset', preset)
    if (preset === 'custom') {
      if (startDate) params.set('start', startDate)
      if (endDate) params.set('end', endDate)
    }
    return params.toString()
  }, [preset, startDate, endDate])

  const exportHref = useMemo(() => `/api/admin/analytics/export?${queryString}`, [queryString])

  const loadReport = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/analytics/report?${queryString}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load analytics report')
      }

      const nextReport = payload?.report as ReportPayload
      setReport(nextReport)
      setAdsenseThisMonth(String(nextReport?.heavy?.adsense?.manual?.thisMonthPkr ?? 0))
      setAdsenseLastMonth(String(nextReport?.heavy?.adsense?.manual?.lastMonthPkr ?? 0))
      if (preset === 'custom') {
        setStartDate(nextReport?.heavy?.range?.startInput || '')
        setEndDate(nextReport?.heavy?.range?.endInput || '')
      }
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load analytics report')
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadReport()
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [loadReport])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      window.open(exportHref, '_blank', 'noopener,noreferrer')
    } finally {
      window.setTimeout(() => setIsExporting(false), 300)
    }
  }

  const handleSaveAdsense = async () => {
    const thisMonthPkr = Number(adsenseThisMonth)
    const lastMonthPkr = Number(adsenseLastMonth)
    if (!Number.isFinite(thisMonthPkr) || thisMonthPkr < 0 || !Number.isFinite(lastMonthPkr) || lastMonthPkr < 0) {
      return
    }

    setIsSavingAdsense(true)
    try {
      const response = await fetch('/api/admin/analytics/adsense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thisMonthPkr,
          lastMonthPkr,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to save AdSense values')
      }
      await loadReport()
    } catch (saveError) {
      console.error(saveError)
    } finally {
      setIsSavingAdsense(false)
    }
  }

  const chartData = report?.heavy.activeUsersChart.points || []
  const subjectUsage = report?.heavy.subjectPerformance.usage || []
  const sourceRows = report?.heavy.signupSources.rows || []
  const leaderboardRows = leaderboardMode === 'current' ? report?.leaderboard.current || [] : report?.leaderboard.best || []
  const peakCells = report?.heavy.peakUsage.cells || []
  const peakMax = peakCells.reduce((max, row) => Math.max(max, row.count), 0)

  const heatmapRows = useMemo(() => {
    const map = new Map<string, number>()
    peakCells.forEach((cell) => map.set(`${cell.day}-${cell.hour}`, cell.count))
    return map
  }, [peakCells])

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <AdminHeader />

      <div className="pt-[56px] lg:pt-[60px]">
        <section className="sticky top-14 z-10 border-b border-slate-200 bg-white px-4 py-4 md:top-[60px] md:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#0f172a]">Analytics &amp; Reports</h1>
              <p className="text-sm text-slate-500">Platform performance and student activity insights</p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:flex-wrap">
                {PRESET_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPreset(option.key)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${preset === option.key
                      ? 'border-[#16a34a] bg-[#16a34a] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-200 hover:text-slate-900'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={preset === 'custom' ? 'default' : 'outline'}
                  className={preset === 'custom' ? 'bg-[#16a34a] hover:bg-[#15803d]' : ''}
                  onClick={() => setPreset('custom')}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {startDate && endDate ? `${formatShortDate(startDate)} -> ${formatShortDate(endDate)}` : 'Custom Range'}
                </Button>
                {preset === 'custom' ? (
                  <>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </>
                ) : null}
                <Button type="button" variant="outline" className="border-emerald-300 text-emerald-700" onClick={handleExport} disabled={isExporting}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Export CSV
                  <ArrowDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-8">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="flex items-center justify-between gap-4">
                <p>{error}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void loadReport()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading && !report ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : null}

          {report ? (
            <>
              <section>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {KPI_META.map((meta) => {
                    const card = report.heavy.kpis[meta.key]
                    return (
                      <KpiCardView
                        key={meta.key}
                        card={card}
                        icon={meta.icon}
                        iconBg={meta.bg}
                        iconColor={meta.iconColor}
                      />
                    )
                  })}
                </div>
              </section>

              <InstituteAnalyticsChart />

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <SectionTitle title="Daily Active Users" subtitle="Students who practiced at least 1 question per day" />
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
                    {(['dau', 'wau', 'mau'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setActivityMode(mode)}
                        className={`rounded-md px-3 py-1 font-semibold ${activityMode === mode ? 'bg-[#16a34a] text-white' : 'text-slate-600'
                          }`}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-chart-height h-[200px] md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      {!isMobileViewport ? <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /> : null}
                      <XAxis dataKey="label" tick={{ fontSize: isMobileViewport ? 10 : 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} hide={isMobileViewport} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'newSignups') return [value, 'New Signups']
                          if (name === 'dau') return [value, 'Daily Active Users']
                          if (name === 'wau') return [value, 'Weekly Active Users']
                          if (name === 'mau') return [value, 'Monthly Active Users']
                          return [value, name]
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={activityMode}
                        stroke="#16a34a"
                        fill="rgba(22,163,74,0.12)"
                        strokeWidth={3}
                      />
                      <Area
                        type="monotone"
                        dataKey="newSignups"
                        stroke="#3b82f6"
                        fill="transparent"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                    Active Users
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-[2px] w-3 border-t-2 border-dashed border-[#3b82f6]" />
                    New Signups
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Today: {report.heavy.activeUsersChart.pills.today} active
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Yesterday: {report.heavy.activeUsersChart.pills.yesterday} active
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Peak day: {report.heavy.activeUsersChart.pills.peak.count} ({report.heavy.activeUsersChart.pills.peak.dayKey})
                  </span>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <SectionTitle title="Student Retention" subtitle="How many students return after their first session" />
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Week</th>
                          <th className="px-3 py-2 text-left">D1</th>
                          <th className="px-3 py-2 text-left">D7</th>
                          <th className="px-3 py-2 text-left">D30</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.heavy.retention.cohorts.map((row) => (
                          <tr key={row.weekLabel} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-700">{row.weekLabel}</td>
                            {[row.d1, row.d7, row.d30].map((value, index) => {
                              const tone =
                                value === null
                                  ? 'bg-slate-50 text-slate-400'
                                  : value >= 60
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : value >= 40
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-rose-50 text-rose-700'
                              return (
                                <td key={`${row.weekLabel}-${index}`} className="px-3 py-2">
                                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
                                    {value === null ? '--' : `${value.toFixed(0)}%`}
                                  </span>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3">
                    <RetentionRing label="Day 1 Retention" value={report.heavy.retention.summary.day1} color="#16a34a" />
                    <RetentionRing label="Day 7 Retention" value={report.heavy.retention.summary.day7} color="#f59e0b" />
                    <RetentionRing label="Day 30 Retention" value={report.heavy.retention.summary.day30} color="#3b82f6" />
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      {report.heavy.retention.summary.atRiskCount} students haven't practiced in 7+ days
                      <a href="/admin/users" className="ml-2 font-semibold underline">
                        View List
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <SectionTitle title="Subject Popularity & Performance" subtitle="Platform-wide subject usage and accuracy data" />
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="admin-chart-height h-[200px] md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectUsage} layout="vertical" margin={{ left: 20, right: 10 }}>
                        {!isMobileViewport ? <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /> : null}
                        <XAxis type="number" hide={isMobileViewport} />
                        <YAxis type="category" dataKey="subjectCode" width={90} tick={{ fontSize: isMobileViewport ? 10 : 12 }} />
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Questions']} />
                        <Bar dataKey="attempts" radius={[6, 6, 6, 6]}>
                          {subjectUsage.map((row) => (
                            <Cell key={row.subjectCode} fill={row.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {subjectUsage.map((row) => (
                        <div key={row.subjectCode} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-semibold text-slate-500">{row.subjectCode}</p>
                          <div className="admin-donut-wrap mt-2 h-20 md:h-24">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Accuracy', value: row.accuracy },
                                    { name: 'Remaining', value: Math.max(0, 100 - row.accuracy) },
                                  ]}
                                  dataKey="value"
                                  innerRadius={24}
                                  outerRadius={36}
                                  startAngle={90}
                                  endAngle={-270}
                                >
                                  <Cell fill={row.accuracy >= 65 ? '#16a34a' : row.accuracy >= 50 ? '#f59e0b' : '#ef4444'} />
                                  <Cell fill="#e2e8f0" />
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-sm font-bold text-slate-800">{row.accuracy.toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        Most practiced subject: {report.heavy.subjectPerformance.insights.mostPracticed}
                      </p>
                      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        Highest accuracy: {report.heavy.subjectPerformance.insights.highestAccuracy}
                      </p>
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Needs attention: {report.heavy.subjectPerformance.insights.needsAttention}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <SectionTitle title="Peak Usage Hours" subtitle="When students are most active on Preptio (PKT)" />
                <div className="overflow-x-auto">
                  <div className="min-w-[940px]">
                    <div className="grid grid-cols-[70px_repeat(24,minmax(28px,1fr))] gap-1 text-[10px]">
                      <div />
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <div key={`head-${hour}`} className="text-center text-slate-400">
                          {hour % 3 === 0
                            ? new Intl.DateTimeFormat('en-US', {
                              hour: 'numeric',
                              hour12: true,
                              timeZone: 'UTC',
                            }).format(new Date(Date.UTC(2026, 0, 1, hour, 0, 0)))
                            : ''}
                        </div>
                      ))}
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, dayIndex) => (
                        <div key={`day-row-${dayName}`} className="contents">
                          <div className="flex items-center text-xs font-semibold text-slate-600">
                            {dayName}
                          </div>
                          {Array.from({ length: 24 }).map((_, hour) => {
                            const value = heatmapRows.get(`${dayIndex}-${hour}`) || 0
                            return (
                              <div
                                key={`${dayName}-${hour}`}
                                title={`${dayName} ${hour}:00 - ${value} questions`}
                                className="h-7 rounded"
                                style={{
                                  backgroundColor: HeatmapCellColor(value, peakMax),
                                }}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Peak time: {report.heavy.peakUsage.insights.peakTimeLabel} ({report.heavy.peakUsage.insights.peakTimeCount} questions)
                  </p>
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Most active day: {report.heavy.peakUsage.insights.mostActiveDay}
                  </p>
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Night owls: {report.heavy.peakUsage.insights.nightOwlPercent.toFixed(1)}%
                  </p>
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Early birds: {report.heavy.peakUsage.insights.earlyBirdPercent.toFixed(1)}%
                  </p>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <SectionTitle title="Signup Sources" subtitle="Where new students are discovering Preptio" />
                  <div className="admin-donut-wrap relative h-[200px] sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sourceRows} dataKey="count" nameKey="source" innerRadius={55} outerRadius={90}>
                          {sourceRows.map((row) => (
                            <Cell key={row.source} fill={SOURCE_COLORS[row.source] || '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-black text-slate-900">{report.heavy.signupSources.total}</p>
                      <p className="text-xs text-slate-500">signups</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    {sourceRows.map((row) => (
                      <div key={row.source} className="flex items-center justify-between text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[row.source] || '#94a3b8' }} />
                          {sourceLabel(row.source)}
                        </span>
                        <span>
                          {row.percent.toFixed(1)}% ({row.count})
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {report.heavy.signupSources.insight}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <SectionTitle title="Device Breakdown" subtitle="How students access Preptio" />
                  <div className="space-y-3">
                    {[
                      { label: 'Mobile', value: report.heavy.deviceUsage.mobile, color: '#16a34a' },
                      { label: 'Desktop', value: report.heavy.deviceUsage.desktop, color: '#3b82f6' },
                      { label: 'Tablet', value: report.heavy.deviceUsage.tablet, color: '#f59e0b' },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{row.label}</span>
                          <span className="font-semibold text-slate-900">{row.value.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full" style={{ width: `${row.value}%`, backgroundColor: row.color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {report.heavy.deviceUsage.insight}
                  </p>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Browser Breakdown</p>
                    {report.heavy.deviceUsage.browsers.map((row) => (
                      <div key={row.browser}>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{row.browser}</span>
                          <span>{row.percent.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${row.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <SectionTitle title="Mock Test Performance" subtitle="Attempts, completion rates and pass rates by test type" />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Test Type</th>
                        <th className="px-3 py-2 text-left">Attempts</th>
                        <th className="px-3 py-2 text-left">Completed</th>
                        <th className="px-3 py-2 text-left">Pass Rate</th>
                        <th className="px-3 py-2 text-left">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.heavy.mockAnalytics.rows.map((row) => (
                        <tr key={row.testType} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                          <td className="px-3 py-2">{row.attempts}</td>
                          <td className="px-3 py-2">{row.completed}</td>
                          <td className={`px-3 py-2 font-semibold ${row.passRate >= 70 ? 'text-emerald-600' : row.passRate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {row.passRate.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2">{row.avgScore.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="admin-chart-height mt-5 h-[200px] md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.heavy.mockAnalytics.trend}>
                      {!isMobileViewport ? <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /> : null}
                      <XAxis dataKey="dayKey" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} hide={isMobileViewport} />
                      <Tooltip />
                      <Bar dataKey="bae" fill="#16a34a" />
                      <Bar dataKey="foa" fill="#7c3aed" />
                      <Bar dataKey="qafb" fill="#ea580c" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {report.heavy.mockAnalytics.insights.map((insight, index) => (
                    <p key={index} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {insight}
                    </p>
                  ))}
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <SectionTitle title="Student Locations" subtitle="Which cities students are practicing from" />
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Rank</th>
                          <th className="px-3 py-2 text-left">City</th>
                          <th className="px-3 py-2 text-left">Students</th>
                          <th className="px-3 py-2 text-left">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.heavy.geography.rows.map((row) => (
                          <tr key={row.city} className="border-t border-slate-100">
                            <td className="px-3 py-2">{medalIcon(row.rank)}</td>
                            <td className="px-3 py-2 font-medium text-slate-700">{row.city}</td>
                            <td className="px-3 py-2">{row.students}</td>
                            <td className="px-3 py-2">
                              <div className="text-xs font-semibold text-slate-700">{row.percent.toFixed(1)}%</div>
                              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                                <div className="h-1.5 rounded-full bg-emerald-500/40" style={{ width: `${row.percent}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="space-y-2">
                      {report.heavy.geography.rows.map((row) => (
                        <div key={`bar-${row.city}`}>
                          <div className="flex items-center justify-between text-sm text-slate-700">
                            <span>{row.city}</span>
                            <span>{row.students}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                              style={{ width: `${row.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {report.heavy.geography.insight}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <SectionTitle title="Streak Leaderboard" subtitle="Most consistent students on the platform" />
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setLeaderboardMode('current')}
                      className={`rounded-md px-3 py-1 font-semibold ${leaderboardMode === 'current' ? 'bg-[#16a34a] text-white' : 'text-slate-600'}`}
                    >
                      Current Streaks
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardMode('best')}
                      className={`rounded-md px-3 py-1 font-semibold ${leaderboardMode === 'best' ? 'bg-[#16a34a] text-white' : 'text-slate-600'}`}
                    >
                      All-Time Best
                    </button>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Rank</th>
                          <th className="px-3 py-2 text-left">Student</th>
                          <th className="px-3 py-2 text-left">Streak</th>
                          <th className="px-3 py-2 text-left">Subjects</th>
                          <th className="px-3 py-2 text-left">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardRows.map((row) => (
                          <tr
                            key={`${leaderboardMode}-${row.userId}`}
                            className="border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => window.location.href = `/admin/analytics/students/${row.userId}`}
                          >
                            <td className="px-3 py-2">{medalIcon(row.rank)}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{row.displayName}</td>
                            <td
                              className={`px-3 py-2 font-semibold ${row.streak >= 30
                                ? 'text-orange-600'
                                : row.streak >= 14
                                  ? 'text-amber-600'
                                  : row.streak >= 7
                                    ? 'text-emerald-600'
                                    : 'text-slate-500'
                                }`}
                            >
                              {row.streak}d {row.streak >= 30 ? '(Hot)' : ''}
                            </td>
                            <td className="px-3 py-2">{row.subjects}</td>
                            <td className="px-3 py-2">{row.accuracy.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3 md:hidden">
                  {leaderboardRows.map((row) => (
                    <div
                      key={`card-${leaderboardMode}-${row.userId}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => window.location.href = `/admin/analytics/students/${row.userId}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.displayName}</p>
                          <p className="text-xs text-slate-500">{row.subjects}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          #{row.rank}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <p>Streak: {row.streak} days</p>
                        <p>Accuracy: {row.accuracy.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {report.leaderboard.distribution.map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>{row.label}</span>
                        <span>
                          {row.percent.toFixed(1)}% ({row.count})
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${row.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <SectionTitle title="AdSense Revenue Overview" subtitle="Estimated earnings from Google AdSense" />
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Manual Revenue Entry</p>
                    <p className="mt-1 text-xs text-slate-500">Enter your earnings from the AdSense dashboard.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-slate-600">
                        This Month (PKR)
                        <input
                          type="number"
                          min={0}
                          value={adsenseThisMonth}
                          onChange={(event) => setAdsenseThisMonth(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Last Month (PKR)
                        <input
                          type="number"
                          min={0}
                          value={adsenseLastMonth}
                          onChange={(event) => setAdsenseLastMonth(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button type="button" onClick={handleSaveAdsense} disabled={isSavingAdsense}>
                        {isSavingAdsense ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                      </Button>
                      <a
                        href="https://www.google.com/adsense"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-700 underline"
                      >
                        Open AdSense Dashboard
                      </a>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Last updated: {formatDate(report.heavy.adsense.manual.updatedAt)}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Revenue Estimates</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-slate-500">Estimated RPM</p>
                        <p className="mt-1 font-bold text-slate-900">${report.heavy.adsense.estimate.rpmUsd.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-slate-500">Page views</p>
                        <p className="mt-1 font-bold text-slate-900">{report.heavy.adsense.estimate.pageViews.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-slate-500">Estimated USD</p>
                        <p className="mt-1 font-bold text-slate-900">${report.heavy.adsense.estimate.estimatedUsd.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Revenue estimates are approximate. Check your Google AdSense dashboard for accurate figures.
                    </p>
                    <div className="admin-chart-height mt-4 h-[200px] md:h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={report.heavy.adsense.manual.history}>
                          {!isMobileViewport ? <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /> : null}
                          <XAxis dataKey="monthKey" tick={{ fontSize: 10 }} />
                          <YAxis hide={isMobileViewport} />
                          <Tooltip />
                          <Bar dataKey="valuePkr" fill="#16a34a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle title="Live Activity" subtitle="Last 50 events on the platform" />
                  <button
                    type="button"
                    onClick={() => void loadReport()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    <RefreshCw size={12} />
                    Refresh
                  </button>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {report.liveActivity.events.map((event) => (
                    <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-medium text-slate-800">
                        <span className="mr-2">{event.icon}</span>
                        {event.message}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{event.subtext}</span>
                        <span>|</span>
                        <span>{event.timestampLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Platform stats job:{' '}
                    {report.heavy.platformStatsJob.status ? (
                      <span className={report.heavy.platformStatsJob.status === 'success' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-600'}>
                        {report.heavy.platformStatsJob.status.toUpperCase()}
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-600">NOT RUN</span>
                    )}
                    {report.heavy.platformStatsJob.runAt ? ` | ${formatDate(report.heavy.platformStatsJob.runAt)}` : ''}
                  </span>
                  <span>Generated: {formatDate(report.heavy.generatedAt)}</span>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </main>
  )
}
