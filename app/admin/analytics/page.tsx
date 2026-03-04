'use client'

import React, { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent } from '@/components/ui/card'

function formatUtcTimestamp(value?: string | null) {
  if (!value) return 'Never'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Never'
  return `${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(parsed)} UTC`
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/analytics')
      if (response.ok) {
        setData(await response.json())
      }
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[80px] pb-12 px-6 max-w-6xl mx-auto space-y-6">
        <h1 className="font-heading text-3xl font-bold text-text-dark">Admin Analytics</h1>

        <Card className="border border-border">
          <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase font-bold text-text-light">Platform Stats Job</p>
              <p className="text-sm text-text-dark mt-1">
                Last run: {formatUtcTimestamp(data?.platformStatsLastRun?.runAt)}
              </p>
            </div>
            {data?.platformStatsLastRun?.status ? (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    data.platformStatsLastRun.status === 'success'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {data.platformStatsLastRun.status === 'success' ? 'Success' : 'Failed'}
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Not run yet
              </span>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-text-light uppercase font-bold">Total Results</p>
              <p className="text-2xl font-black">{data?.totalResults ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-text-light uppercase font-bold">Avg Duration</p>
              <p className="text-2xl font-black">{Math.round(data?.avgDuration || 0)} sec</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-text-light uppercase font-bold">Avg Questions</p>
              <p className="text-2xl font-black">{Math.round(data?.avgQuestions || 0)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold">Peak Usage Hours</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(data?.usageByHour || []).map((row: any, idx: number) => (
                <div key={row._id ?? `hour-${row.hour ?? idx}`} className="border border-border rounded-lg p-3">
                  <p className="text-xs text-text-light">Hour {row._id}</p>
                  <p className="text-lg font-bold">{row.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
