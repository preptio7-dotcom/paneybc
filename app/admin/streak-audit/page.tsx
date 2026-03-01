'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type ActionFilter =
  | 'all'
  | 'increment'
  | 'reset'
  | 'no_change'
  | 'first_time'
  | 'reconciliation_reset'

type StreakAuditRow = {
  id: string
  userId: string
  endpoint: string
  creditedDate: string
  credited: boolean
  actionType: ActionFilter
  streakBefore: number
  streakAfter: number
  createdAt: string
  user?: {
    id: string
    email: string
    name: string
  }
}

type LastReconciliationRun = {
  runAt: string
  triggeredBy: 'cron_auto' | 'admin_manual' | string
  usersAffected: number
  status: 'success' | 'failed' | string
} | null

const RECONCILIATION_COOLDOWN_SECONDS = 60
const RECONCILIATION_COOLDOWN_STORAGE_KEY = 'reconciliation_cooldown_until'

const ACTION_BADGE_STYLES: Record<ActionFilter, string> = {
  all: '',
  increment: 'bg-emerald-600 text-white',
  reset: 'bg-amber-500 text-white',
  no_change: 'bg-slate-500 text-white',
  first_time: 'bg-blue-600 text-white',
  reconciliation_reset: 'bg-rose-600 text-white',
}

export default function AdminStreakAuditPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<StreakAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [actionType, setActionType] = useState<ActionFilter>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isRunningReconciliation, setIsRunningReconciliation] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false)
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)
  const [lastReconciliationRun, setLastReconciliationRun] = useState<LastReconciliationRun>(null)
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0)

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (actionType !== 'all') params.set('actionType', actionType)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return params.toString()
  }, [search, actionType, from, to])

  const query = useMemo(() => {
    const params = new URLSearchParams(filterQuery)
    params.set('page', String(page))
    params.set('pageSize', '20')
    return params.toString()
  }, [filterQuery, page])

  const loadRows = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/streak-audit?${query}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load streak audit logs')
      }
      setRows(data.rows || [])
      setTotalPages(Number(data.totalPages) || 1)
      setTotal(Number(data.total) || 0)
      setLastReconciliationRun(data.lastReconciliationRun || null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to load streak audit logs.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [search, actionType, from, to])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(RECONCILIATION_COOLDOWN_STORAGE_KEY)
    if (!raw) return
    const until = Number(raw)
    if (!Number.isFinite(until) || until <= Date.now()) {
      window.localStorage.removeItem(RECONCILIATION_COOLDOWN_STORAGE_KEY)
      return
    }
    setCooldownRemainingSeconds(Math.ceil((until - Date.now()) / 1000))
  }, [])

  useEffect(() => {
    if (cooldownRemainingSeconds <= 0) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(RECONCILIATION_COOLDOWN_STORAGE_KEY)
      }
      return
    }

    const interval = window.setInterval(() => {
      const raw = window.localStorage.getItem(RECONCILIATION_COOLDOWN_STORAGE_KEY)
      if (!raw) {
        setCooldownRemainingSeconds(0)
        return
      }
      const until = Number(raw)
      const remaining = Math.ceil((until - Date.now()) / 1000)
      if (!Number.isFinite(remaining) || remaining <= 0) {
        window.localStorage.removeItem(RECONCILIATION_COOLDOWN_STORAGE_KEY)
        setCooldownRemainingSeconds(0)
        return
      }
      setCooldownRemainingSeconds(remaining)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [cooldownRemainingSeconds])

  const runReconciliationNow = async () => {
    try {
      setIsRunningReconciliation(true)
      const response = await fetch('/api/cron/streak-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run reconciliation')
      }

      toast({
        title: 'Reconciliation complete',
        description: `${Number(data.usersAffected ?? data.affectedCount ?? 0)} users affected.`,
      })
      const cooldownUntil = Date.now() + RECONCILIATION_COOLDOWN_SECONDS * 1000
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECONCILIATION_COOLDOWN_STORAGE_KEY, String(cooldownUntil))
      }
      setCooldownRemainingSeconds(RECONCILIATION_COOLDOWN_SECONDS)
      setReconcileConfirmOpen(false)
      await loadRows()
      setLastReconciliationRun({
        runAt: String(data.runAt || new Date().toISOString()),
        triggeredBy: String(data.triggeredBy || 'admin_manual'),
        usersAffected: Number(data.usersAffected ?? data.affectedCount ?? 0),
        status: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Reconciliation failed',
        description: error.message || 'Check server logs.',
        variant: 'destructive',
      })
    } finally {
      setIsRunningReconciliation(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true)
      const params = new URLSearchParams(filterQuery)
      params.set('limit', '10000')

      const response = await fetch(`/api/admin/streak-audit/export?${params.toString()}`, {
        method: 'GET',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to export CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const dateKey = new Date().toISOString().slice(0, 10)
      anchor.href = url
      anchor.download = `streak-audit-${dateKey}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Unable to prepare CSV right now.',
        variant: 'destructive',
      })
    } finally {
      setIsExportingCsv(false)
    }
  }

  const hasFilters = Boolean(search.trim() || actionType !== 'all' || from || to)
  const filtersSummary = useMemo(() => {
    const tokens: string[] = []
    if (search.trim()) tokens.push(search.trim())
    if (from || to) {
      tokens.push(`${from || '...'} to ${to || '...'}`)
    }
    if (actionType !== 'all') {
      tokens.push(actionType)
    }
    return tokens.join(' · ')
  }, [search, from, to, actionType])

  const exportFilename = useMemo(
    () => `streak-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    []
  )

  const lastRunDisplay = useMemo(() => {
    if (!lastReconciliationRun?.runAt) return 'Never'
    const date = new Date(lastReconciliationRun.runAt)
    if (Number.isNaN(date.getTime())) return 'Never'
    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(date)
    return `${formatted} UTC`
  }, [lastReconciliationRun])

  const triggerBadgeStyle = !lastReconciliationRun
    ? 'bg-slate-100 text-slate-600'
    : lastReconciliationRun.triggeredBy === 'admin_manual'
      ? 'bg-[#dbeafe] text-[#1d4ed8]'
      : 'bg-[#dcfce7] text-[#166534]'

  const triggerLabel = !lastReconciliationRun
    ? '—'
    : lastReconciliationRun.triggeredBy === 'admin_manual'
      ? 'Admin Manual'
      : 'Automated (Daily)'

  const statusLabel = !lastReconciliationRun
    ? 'Never'
    : lastReconciliationRun.status === 'failed'
      ? '❌ Failed'
      : '✅ Success'
  const statusClass = !lastReconciliationRun
    ? 'text-slate-500'
    : lastReconciliationRun.status === 'failed'
      ? 'text-red-600'
      : 'text-green-600'

  const isReconciliationDisabled = isRunningReconciliation || cooldownRemainingSeconds > 0
  const cooldownProgressPercent =
    cooldownRemainingSeconds > 0
      ? Math.max(0, Math.min(100, (cooldownRemainingSeconds / RECONCILIATION_COOLDOWN_SECONDS) * 100))
      : 0

  const reconciliationButtonText = isRunningReconciliation
    ? '⏳ Running...'
    : cooldownRemainingSeconds > 0
      ? `⏳ Available in ${cooldownRemainingSeconds}s`
      : '⚙️ Run Reconciliation Now'

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">Streak Audit Log</h1>
              <p className="text-text-light">
                Search streak updates by user ID/email and review every increment/reset event.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[220px]">
                <Button
                  variant="outline"
                  className="w-full rounded-[10px] border border-[#e2e8f0] bg-white px-[18px] py-[10px] text-[13px] font-semibold text-[#0f172a] hover:bg-[#f8fafc] hover:border-[#94a3b8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  onClick={() => setReconcileConfirmOpen(true)}
                  disabled={isReconciliationDisabled}
                >
                  {reconciliationButtonText}
                </Button>
                {cooldownRemainingSeconds > 0 ? (
                  <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className="h-full bg-primary-green transition-[width] duration-1000 ease-linear"
                      style={{ width: `${cooldownProgressPercent}%` }}
                    />
                  </div>
                ) : null}
              </div>
              <Button
                variant="outline"
                className="rounded-[10px] border border-[#e2e8f0] bg-white px-[18px] py-[10px] text-[13px] font-semibold text-[#0f172a] hover:bg-[#f8fafc] hover:border-[#94a3b8]"
                onClick={() => setExportConfirmOpen(true)}
                disabled={isExportingCsv}
              >
                {isExportingCsv ? '⏳ Preparing CSV...' : '⬇️ Export CSV'}
              </Button>
            </div>
          </div>

          <Card className="border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-8">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last Run</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{lastRunDisplay}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Triggered By</p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${triggerBadgeStyle}`}>
                    {triggerLabel}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Users Affected</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {lastReconciliationRun ? (lastReconciliationRun.usersAffected > 0 ? `${lastReconciliationRun.usersAffected} users` : 'No users affected') : 'No users affected'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <p className={`mt-1 text-sm font-semibold ${statusClass}`}>{statusLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Use action and date filters to investigate support tickets quickly.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">User ID or Email</Label>
                <Input
                  id="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search..."
                />
              </div>
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={actionType} onValueChange={(value) => setActionType(value as ActionFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="increment">increment</SelectItem>
                    <SelectItem value="first_time">first_time</SelectItem>
                    <SelectItem value="reset">reset</SelectItem>
                    <SelectItem value="no_change">no_change</SelectItem>
                    <SelectItem value="reconciliation_reset">reconciliation_reset</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Audit Entries</CardTitle>
                <CardDescription>{total} total events</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Previous
                </Button>
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Next
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3 min-w-[220px]">User</TableHead>
                    <TableHead className="px-4 py-3 min-w-[180px]">Endpoint</TableHead>
                    <TableHead className="px-4 py-3 min-w-[160px]">Action</TableHead>
                    <TableHead className="px-4 py-3 min-w-[130px]">Credited Date</TableHead>
                    <TableHead className="px-4 py-3 min-w-[100px]">Credited</TableHead>
                    <TableHead className="px-4 py-3 min-w-[140px]">Streak</TableHead>
                    <TableHead className="px-4 py-3 min-w-[170px]">Logged At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Loading streak audit logs...
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No streak audit events found for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="px-4 py-4 align-top">
                          <p className="font-semibold text-slate-900">{row.user?.name || row.userId}</p>
                          <p className="text-xs text-slate-500">{row.user?.email || row.userId}</p>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-slate-700">{row.endpoint}</TableCell>
                        <TableCell className="px-4 py-4 align-top">
                          <Badge className={ACTION_BADGE_STYLES[row.actionType] || 'bg-slate-600 text-white'}>
                            {row.actionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-slate-700">
                          {new Date(row.creditedDate).toISOString().slice(0, 10)}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-slate-700">
                          {row.credited ? 'Yes' : 'No'}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-slate-700">
                          {row.streakBefore} → {row.streakAfter}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-top text-slate-500">
                          {new Date(row.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={reconcileConfirmOpen} onOpenChange={setReconcileConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Run streak reconciliation now?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to run the streak reconciliation now? This will reset streaks
              for all users who have not practiced today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRunningReconciliation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void runReconciliationNow()
              }}
              disabled={isRunningReconciliation}
              className="bg-[#16a34a] hover:bg-[#15803d] text-white"
            >
              {isRunningReconciliation ? '⏳ Running...' : 'Yes, Run It'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl bg-white p-7">
          <DialogHeader className="items-center text-center">
            <div className="text-[40px] leading-none">📊</div>
            <DialogTitle className="text-[18px] font-bold text-slate-900">Ready to Export</DialogTitle>
            {total > 0 ? (
              <DialogDescription className="text-sm text-slate-600">
                About to export <span className="font-bold text-primary-green">{total}</span> rows
              </DialogDescription>
            ) : (
              <DialogDescription className="text-sm text-slate-600">
                No data to export
              </DialogDescription>
            )}
          </DialogHeader>

          {total > 0 ? (
            <div className="space-y-3 text-center">
              <p className="text-xs text-slate-500">
                {hasFilters ? `Filtered by: ${filtersSummary}` : 'Showing all records (last 10,000 rows max)'}
              </p>
              <p className="text-xs text-slate-500">📄 File: {exportFilename}</p>
              {total > 5000 ? (
                <div className="rounded-lg bg-[#fef9c3] px-3 py-2 text-xs text-[#854d0e]">
                  ⚠️ Large export — this may take a few seconds to generate.
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500">
              There are no records matching your current filters.
            </p>
          )}

          <DialogFooter className="mt-2">
            {total > 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setExportConfirmOpen(false)}
                  disabled={isExportingCsv}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#16a34a] text-white hover:bg-[#15803d]"
                  onClick={async () => {
                    setExportConfirmOpen(false)
                    await handleExportCsv()
                  }}
                  disabled={isExportingCsv}
                >
                  ⬇️ Download CSV
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setExportConfirmOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
