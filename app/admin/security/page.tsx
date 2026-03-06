'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Lock, Shield, ShieldCheck } from 'lucide-react'

type SecuritySummary = {
  blockedCount: number
  suspiciousCount: number
  failedLoginsToday: number
  totalEvents: number
  activeThreatUnreviewedCount: number
}

export default function AdminSecurityOverviewPage() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadSummary = async () => {
      try {
        const response = await fetch('/api/admin/ip-security/summary', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (!isMounted) return
        setSummary(data)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadSummary()
    return () => {
      isMounted = false
    }
  }, [])

  const cards = [
    {
      title: 'Active Threat IPs',
      value: summary?.activeThreatUnreviewedCount ?? 0,
      icon: AlertTriangle,
      iconClass: 'text-red-600',
      iconBg: 'bg-red-100',
    },
    {
      title: 'Blocked IPs',
      value: summary?.blockedCount ?? 0,
      icon: Lock,
      iconClass: 'text-slate-700',
      iconBg: 'bg-slate-100',
    },
    {
      title: 'Suspicious Events',
      value: summary?.suspiciousCount ?? 0,
      icon: Shield,
      iconClass: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
    {
      title: 'Total Security Events',
      value: summary?.totalEvents ?? 0,
      icon: ShieldCheck,
      iconClass: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
  ]

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6 space-y-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">Security Overview</h1>
            <p className="text-text-light">
              Monitor platform security health and jump directly to investigation tools.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4 md:gap-4">
            {cards.map((card) => (
              <Card key={card.title} className="border-border">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${card.iconBg}`}>
                      <card.icon size={20} className={card.iconClass} />
                    </div>
                    <div>
                      <p className="admin-kpi-label text-xs text-text-light md:text-sm">{card.title}</p>
                      <p className="admin-kpi-value text-xl font-bold text-text-dark md:text-2xl">
                        {loading ? '...' : card.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Security Tools</CardTitle>
              <CardDescription>Use these pages to respond to incidents and manage security.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link href="/admin/ip-security">
                <Button>Open IP Security Manager</Button>
              </Link>
              <Link href="/admin/audit-logs">
                <Button variant="outline">Open Audit Logs</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}


