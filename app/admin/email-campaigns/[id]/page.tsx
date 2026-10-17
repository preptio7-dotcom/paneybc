'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Row = {
  id: string
  email: string
  name: string | null
  status: 'pending' | 'sent' | 'failed'
  sentAt: string | null
  attempts: number
  lastError: string | null
}

type Data = {
  schedule: { id: string; name: string; status: string; sentAt: string | null; lastError: string | null }
  counts: { pending: number; sent: number; failed: number; total: number }
  quota: { dailyLimit: number; sentToday: number; leftToday: number; daysToFinishPending: number }
  rows: Row[]
  filteredTotal: number
  page: number
  pages: number
}

const FILTERS = ['all', 'sent', 'pending', 'failed'] as const

export default function CampaignRecipientsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = `status=${filter === 'all' ? '' : filter}&page=${page}&limit=50`

  const load = useCallback(() => {
    fetch(`/api/admin/email-campaigns/${id}/recipients?${query}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Failed to load')
        setData(body)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [id, query])

  useEffect(() => {
    load()
  }, [load])

  async function downloadCsv() {
    const res = await fetch(
      `/api/admin/email-campaigns/${id}/recipients?format=csv${filter === 'all' ? '' : `&status=${filter}`}`
    )
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-${id}-${filter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error)
    return (
      <div className="space-y-4 p-6">
        <BackToCampaigns />
        <div className="text-red-600">{error}</div>
      </div>
    )
  if (!data)
    return (
      <div className="space-y-4 p-6">
        <BackToCampaigns />
        <div>Loading…</div>
      </div>
    )

  return (
    <div className="space-y-6 p-6">
      <BackToCampaigns />

      <div>
        <h1 className="text-2xl font-bold">{data.schedule.name}</h1>
        <p className="text-sm text-slate-600">Campaign status: {data.schedule.status}</p>
        {data.schedule.lastError && <p className="text-sm text-amber-700">Last note: {data.schedule.lastError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Total" value={data.counts.total} />
        <Stat label="Sent" value={data.counts.sent} />
        <Stat label="Waiting" value={data.counts.pending} />
        <Stat label="Failed" value={data.counts.failed} />
        <Stat label="Left today" value={`${data.quota.leftToday} / ${data.quota.dailyLimit}`} />
      </div>

      {data.counts.pending > 0 && (
        <p className="text-sm text-slate-700">
          {data.counts.pending} recipients are still waiting. At {data.quota.dailyLimit} per day this takes about{' '}
          {data.quota.daysToFinishPending} more day(s).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f)
              setPage(1)
            }}
            className={`rounded-md border px-3 py-1 text-sm ${filter === f ? 'bg-green-600 text-white' : ''}`}
          >
            {f}
          </button>
        ))}
        <button onClick={downloadCsv} className="ml-auto rounded-md border px-3 py-1 text-sm">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-2">Email</th>
              <th className="p-2">Name</th>
              <th className="p-2">Status</th>
              <th className="p-2">Sent at (UTC)</th>
              <th className="p-2">Attempts</th>
              <th className="p-2">Last error</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.name || '—'}</td>
                <td className="p-2 capitalize">{r.status}</td>
                <td className="p-2">{r.sentAt ? new Date(r.sentAt).toISOString().replace('T', ' ').slice(0, 16) : '—'}</td>
                <td className="p-2">{r.attempts}</td>
                <td className="p-2 text-red-600">{r.lastError || ''}</td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={6}>
                  No recipients in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">
          Previous
        </button>
        <span>
          Page {data.page} of {data.pages} ({data.filteredTotal} rows)
        </span>
        <button
          disabled={page >= data.pages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function BackToCampaigns() {
  return (
    <Link
      href="/admin/email-campaigns"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary-green transition-colors"
    >
      <ArrowLeft size={16} />
      Back to campaigns
    </Link>
  )
}
