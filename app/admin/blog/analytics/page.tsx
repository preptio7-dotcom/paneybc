'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  Clock3,
  Eye,
  MousePointer,
  UserPlus,
} from 'lucide-react'
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
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type RangePreset = '7d' | '30d' | '90d' | 'all'

type OverviewPayload = {
  metrics: {
    totalViews: number
    avgReadTimeSeconds: number
    avgScrollDepth: number
    ctaClicks: number
    ctaCtr: number
    signups: number
    conversionRate: number
    viewsChangePercent: number
  }
}

type SourcePayload = {
  topSource: string
  sources: Array<{ source: string; count: number; percentage: number }>
}

type PostRow = {
  id: string
  title: string
  slug: string
  publishedAt: string | null
  views: number
  avgReadTimeSeconds: number
  avgScrollDepth: number
  ctaClicks: number
  ctaCtr: number
  signups: number
  readCompletionRate: number
}

type SortKey =
  | 'views'
  | 'avgReadTime'
  | 'avgScrollDepth'
  | 'ctaClicks'
  | 'ctaCtr'
  | 'signups'
  | 'publishedAt'

type PostsPayload = {
  items: PostRow[]
}

type CtaPayload = {
  rows: Array<{
    subjectCode: string
    subjectName: string
    impressions: number
    clicks: number
    ctr: number
    signups: number
  }>
  insight: string
}

type FunnelPayload = {
  levels: Array<{ label: string; count: number; percentage: number }>
}

const SOURCE_COLORS: Record<string, string> = {
  google: '#4285F4',
  whatsapp: '#25D366',
  facebook: '#1877F2',
  direct: '#64748b',
  other: '#94a3b8',
}

const FUNNEL_COLORS = ['#e2e8f0', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d']

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

function resolveRange(preset: RangePreset) {
  const now = new Date()
  if (preset === 'all') {
    return { from: new Date('2020-01-01T00:00:00.000Z'), to: now }
  }
  const days = preset === '90d' ? 90 : preset === '30d' ? 30 : 7
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - (days - 1))
  from.setUTCHours(0, 0, 0, 0)
  return { from, to: now }
}

export default function AdminBlogAnalyticsPage() {
  const [preset, setPreset] = useState<RangePreset>('7d')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewPayload['metrics'] | null>(null)
  const [sources, setSources] = useState<SourcePayload>({ topSource: 'direct', sources: [] })
  const [posts, setPosts] = useState<PostRow[]>([])
  const [ctaRows, setCtaRows] = useState<CtaPayload>({ rows: [], insight: '' })
  const [funnel, setFunnel] = useState<FunnelPayload>({ levels: [] })
  const [timeline, setTimeline] = useState<Array<{ date: string; views: number }>>([])
  const [sortBy, setSortBy] = useState<SortKey>('views')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const { from, to } = resolveRange(preset)
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
      const postsParams = new URLSearchParams(params)
      postsParams.set('sortBy', sortBy)
      postsParams.set('sortOrder', sortOrder)
      try {
        const [overviewRes, sourcesRes, postsRes, ctaRes, funnelRes, timelineRes] = await Promise.all([
          fetch(`/api/admin/blog/analytics/overview?${params.toString()}`, { cache: 'no-store' }),
          fetch(`/api/admin/blog/analytics/sources?${params.toString()}`, { cache: 'no-store' }),
          fetch(`/api/admin/blog/analytics/posts?${postsParams.toString()}`, { cache: 'no-store' }),
          fetch(`/api/admin/blog/analytics/cta?${params.toString()}`, { cache: 'no-store' }),
          fetch(`/api/admin/blog/analytics/funnel?${params.toString()}`, { cache: 'no-store' }),
          fetch(`/api/admin/blog/analytics/timeline?${params.toString()}`, { cache: 'no-store' }),
        ])

        if (!mounted) return
        if (overviewRes.ok) {
          const data: OverviewPayload = await overviewRes.json()
          setOverview(data.metrics)
        }
        if (sourcesRes.ok) {
          const data: SourcePayload = await sourcesRes.json()
          setSources(data)
        }
        if (postsRes.ok) {
          const data: PostsPayload = await postsRes.json()
          setPosts(Array.isArray(data.items) ? data.items : [])
        }
        if (ctaRes.ok) {
          const data: CtaPayload = await ctaRes.json()
          setCtaRows(data)
        }
        if (funnelRes.ok) {
          const data: FunnelPayload = await funnelRes.json()
          setFunnel(data)
        }
        if (timelineRes.ok) {
          const data = await timelineRes.json()
          setTimeline(Array.isArray(data?.timeline) ? data.timeline : [])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [preset, sortBy, sortOrder])

  const trafficInsight = useMemo(() => {
    if (sources.topSource === 'google') {
      return 'Most readers find you through Google Search — keep publishing SEO-focused content.'
    }
    if (sources.topSource === 'whatsapp') {
      return 'WhatsApp is your top traffic source — keep sharing in student communities.'
    }
    if (sources.topSource === 'facebook') {
      return 'Facebook is driving strong traffic — keep promoting high-performing posts there.'
    }
    return 'Direct readers are strong — keep a consistent publishing cadence.'
  }, [sources.topSource])

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(key)
    setSortOrder('desc')
  }

  const sortIndicator = (key: SortKey) => {
    if (sortBy !== key) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">Blog Analytics</h1>
              <p className="text-sm text-slate-500">Performance, engagement, and conversion insights.</p>
            </div>
            <div className="flex gap-2">
              <Select value={preset} onValueChange={(value) => setPreset(value as RangePreset)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Link href={`/api/admin/blog/analytics/export?from=${encodeURIComponent(resolveRange(preset).from.toISOString())}&to=${encodeURIComponent(resolveRange(preset).to.toISOString())}`}>
                <Button variant="outline">Export CSV</Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4 md:gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="admin-kpi-label text-xs text-slate-500 inline-flex items-center gap-1"><Eye size={12} />Total Views</p>
              <p className="admin-kpi-value mt-2 text-xl font-bold text-slate-900 md:text-2xl">{overview?.totalViews ?? 0}</p>
              <p className={`mt-1 text-xs ${(overview?.viewsChangePercent ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {(overview?.viewsChangePercent ?? 0).toFixed(1)}% vs previous period
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="admin-kpi-label text-xs text-slate-500 inline-flex items-center gap-1"><Clock3 size={12} />Avg Read Time</p>
              <p className="admin-kpi-value mt-2 text-xl font-bold text-slate-900 md:text-2xl">{formatDuration(overview?.avgReadTimeSeconds ?? 0)}</p>
              <p className="mt-1 text-xs text-slate-500">Avg scroll depth: {(overview?.avgScrollDepth ?? 0).toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="admin-kpi-label text-xs text-slate-500 inline-flex items-center gap-1"><MousePointer size={12} />CTA Clicks</p>
              <p className="admin-kpi-value mt-2 text-xl font-bold text-slate-900 md:text-2xl">{overview?.ctaClicks ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">{(overview?.ctaCtr ?? 0).toFixed(1)}% CTR</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="admin-kpi-label text-xs text-slate-500 inline-flex items-center gap-1"><UserPlus size={12} />Signups from Blog</p>
              <p className="admin-kpi-value mt-2 text-xl font-bold text-slate-900 md:text-2xl">{overview?.signups ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">{(overview?.conversionRate ?? 0).toFixed(1)}% conversion</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-800">Where Are Your Readers Coming From?</h2>
              <div className="admin-donut-wrap mt-4 h-[200px] md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sources.sources} dataKey="count" nameKey="source" innerRadius={60} outerRadius={90}>
                      {sources.sources.map((source) => (
                        <Cell key={source.source} fill={SOURCE_COLORS[source.source] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} visits`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                {sources.sources.map((source) => (
                  <div key={source.source} className="flex items-center justify-between text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[source.source] || '#94a3b8' }} />
                      {source.source}
                    </span>
                    <span>{source.percentage.toFixed(1)}% ({source.count})</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">💡 {trafficInsight}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-800">Views Over Time</h2>
              <div className="admin-chart-height mt-4 h-[200px] md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" stroke="#16a34a" fill="#bbf7d0" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">Best Performing Articles</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Post</th>
                    <th className="p-2 text-left">
                      <button type="button" onClick={() => toggleSort('views')} className="font-semibold hover:text-primary-green">
                        {`Views${sortIndicator('views')}`}
                      </button>
                    </th>
                    <th className="p-2 text-left">
                      <button type="button" onClick={() => toggleSort('avgReadTime')} className="font-semibold hover:text-primary-green">
                        {`Avg Read${sortIndicator('avgReadTime')}`}
                      </button>
                    </th>
                    <th className="p-2 text-left">
                      <button type="button" onClick={() => toggleSort('avgScrollDepth')} className="font-semibold hover:text-primary-green">
                        {`Scroll${sortIndicator('avgScrollDepth')}`}
                      </button>
                    </th>
                    <th className="p-2 text-left">
                      <button type="button" onClick={() => toggleSort('ctaClicks')} className="font-semibold hover:text-primary-green">
                        {`CTA Clicks${sortIndicator('ctaClicks')}`}
                      </button>
                    </th>
                    <th className="p-2 text-left">
                      <button type="button" onClick={() => toggleSort('ctaCtr')} className="font-semibold hover:text-primary-green">
                        {`CTA CTR${sortIndicator('ctaCtr')}`}
                      </button>
                    </th>
                    <th className="p-2 text-left">
                      <button type="button" onClick={() => toggleSort('signups')} className="font-semibold hover:text-primary-green">
                        {`Signups${sortIndicator('signups')}`}
                      </button>
                    </th>
                    <th className="p-2 text-left">
                      <button type="button" onClick={() => toggleSort('publishedAt')} className="font-semibold hover:text-primary-green">
                        {`Published${sortIndicator('publishedAt')}`}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, index) => (
                    <tr key={post.id} className="border-t border-slate-100">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">
                        <Link href={`/blog/${post.slug}`} target="_blank" className="font-medium text-slate-800 hover:text-primary-green">
                          {post.title}
                        </Link>
                      </td>
                      <td className="p-2">{post.views}</td>
                      <td className="p-2">{formatDuration(post.avgReadTimeSeconds)}</td>
                      <td className={`p-2 ${post.avgScrollDepth >= 70 ? 'text-emerald-600' : post.avgScrollDepth >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {post.avgScrollDepth.toFixed(1)}%
                      </td>
                      <td className="p-2">{post.ctaClicks}</td>
                      <td className={`p-2 ${post.ctaCtr >= 10 ? 'text-emerald-600' : post.ctaCtr >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {post.ctaCtr.toFixed(1)}%
                      </td>
                      <td className="p-2">{post.signups}</td>
                      <td className="p-2">{post.publishedAt ? post.publishedAt.slice(0, 10) : '-'}</td>
                    </tr>
                  ))}
                  {!posts.length && !loading ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-sm text-slate-500">
                        No post analytics in this date range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-800">Which Subject CTAs Are Converting?</h2>
              <div className="mt-3 space-y-2">
                {ctaRows.rows.map((row) => (
                  <div key={row.subjectCode} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                      <span>{row.subjectName}</span>
                      <span>{row.ctr.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-primary-green"
                        style={{ width: `${Math.min(100, row.ctr)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Impressions: {row.impressions} | Clicks: {row.clicks} | Signups: {row.signups}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">💡 {ctaRows.insight}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-800">How Far Are Readers Getting?</h2>
              <div className="admin-chart-height mt-4 h-[200px] md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel.levels} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="label" type="category" width={130} />
                    <Tooltip />
                    <Bar dataKey="percentage">
                      {funnel.levels.map((_, index) => (
                        <Cell key={index} fill={FUNNEL_COLORS[index] || '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

