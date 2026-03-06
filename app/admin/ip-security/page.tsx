'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Ban, Download, Lock, Plus, ShieldCheck, ShieldX, UserCheck } from 'lucide-react'

type SecurityStatus = 'active_threat' | 'suspicious' | 'resolved' | 'blocked'
type ActivityType =
  | 'failed_login'
  | 'brute_force_attempt'
  | 'too_many_requests'
  | 'account_lockout'
  | 'csrf_violation'
  | 'xss_attempt'

type SummaryData = {
  blockedCount: number
  suspiciousCount: number
  failedLoginsToday: number
  totalEvents: number
  activeThreatUnreviewedCount: number
}

type LogRow = {
  id: string
  ipAddress: string
  activityType: ActivityType
  targetUserId: string | null
  targetEndpoint: string | null
  attemptsCount: number
  firstSeen: string
  lastSeen: string
  status: SecurityStatus
}

type LogsResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  rows: LogRow[]
}

type BlockedRow = {
  id: string
  ipAddress: string
  reason: string
  blockedBy: string
  blockedAt: string
  isActive: boolean
  blockSource: 'auto' | 'admin'
  totalAttemptsBeforeBlock: number
}

type BlockedResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  rows: BlockedRow[]
}

type WhitelistRow = {
  id: string
  ipAddress: string
  label: string | null
  addedBy: string
  addedAt: string
}

type WhitelistResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  rows: WhitelistRow[]
}

type AuditRow = {
  id: string
  adminId: string
  action: string
  ipAddress: string
  reason: string | null
  performedAt: string
}

type AuditResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  rows: AuditRow[]
}

type IpDetail = {
  ipAddress: string
  geo: {
    country: string
    city: string
    organization: string
  }
  currentStatus: string
  blockedEntry: BlockedRow | null
  whitelisted: boolean
  timeline: LogRow[]
  totals: {
    totalRequests: number
    failedLogins: number
    accountsTargeted: number
  }
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  failed_login: 'Failed Login',
  brute_force_attempt: 'Brute Force Attempt',
  too_many_requests: 'Too Many Requests',
  account_lockout: 'Account Lockout Triggered',
  csrf_violation: 'CSRF Violation',
  xss_attempt: 'XSS Attempt',
}

const STATUS_LABELS: Record<SecurityStatus, string> = {
  active_threat: 'Active Threat',
  suspicious: 'Suspicious',
  resolved: 'Resolved',
  blocked: 'Blocked',
}

const STATUS_CLASSES: Record<SecurityStatus, string> = {
  active_threat: 'bg-red-100 text-red-700 border-red-200',
  suspicious: 'bg-orange-100 text-orange-700 border-orange-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  blocked: 'bg-slate-700 text-white border-slate-700',
}

const LOG_SORT_COLUMNS = [
  'ipAddress',
  'activityType',
  'attemptsCount',
  'firstSeen',
  'lastSeen',
  'status',
  'createdAt',
] as const
type LogSortColumn = (typeof LOG_SORT_COLUMNS)[number]

const IP_PATTERN =
  /^(?:(?:\d{1,3}\.){3}\d{1,3}|(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4})$/

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function toStatusBadge(status: SecurityStatus) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

function buildQueryString(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    const str = String(value).trim()
    if (!str) continue
    query.set(key, str)
  }
  return query.toString()
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data as T
}

export default function AdminIpSecurityPage() {
  const { toast } = useToast()

  const [summary, setSummary] = useState<SummaryData>({
    blockedCount: 0,
    suspiciousCount: 0,
    failedLoginsToday: 0,
    totalEvents: 0,
    activeThreatUnreviewedCount: 0,
  })
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('activity')

  const [logsLoading, setLogsLoading] = useState(true)
  const [logRows, setLogRows] = useState<LogRow[]>([])
  const [logPage, setLogPage] = useState(1)
  const [logTotalPages, setLogTotalPages] = useState(1)
  const [logTotal, setLogTotal] = useState(0)
  const [logSearch, setLogSearch] = useState('')
  const [logActivityType, setLogActivityType] = useState<'all' | ActivityType>('all')
  const [logStatus, setLogStatus] = useState<'all' | SecurityStatus>('all')
  const [logDateFrom, setLogDateFrom] = useState('')
  const [logDateTo, setLogDateTo] = useState('')
  const [logSortBy, setLogSortBy] = useState<LogSortColumn>('lastSeen')
  const [logSortOrder, setLogSortOrder] = useState<'asc' | 'desc'>('desc')

  const [blockedLoading, setBlockedLoading] = useState(true)
  const [blockedRows, setBlockedRows] = useState<BlockedRow[]>([])
  const [blockedPage, setBlockedPage] = useState(1)
  const [blockedTotalPages, setBlockedTotalPages] = useState(1)
  const [blockedSearch, setBlockedSearch] = useState('')
  const [blockedSource, setBlockedSource] = useState<'all' | 'auto' | 'admin'>('all')

  const [whitelistLoading, setWhitelistLoading] = useState(true)
  const [whitelistRows, setWhitelistRows] = useState<WhitelistRow[]>([])
  const [whitelistPage, setWhitelistPage] = useState(1)
  const [whitelistTotalPages, setWhitelistTotalPages] = useState(1)
  const [whitelistSearch, setWhitelistSearch] = useState('')

  const [auditLoading, setAuditLoading] = useState(true)
  const [auditRows, setAuditRows] = useState<AuditRow[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedIp, setSelectedIp] = useState('')
  const [detailData, setDetailData] = useState<IpDetail | null>(null)

  const [blockIpAddress, setBlockIpAddress] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [alsoBlockSubnet, setAlsoBlockSubnet] = useState(false)
  const [blockSubmitting, setBlockSubmitting] = useState(false)

  const [whitelistIpAddress, setWhitelistIpAddress] = useState('')
  const [whitelistLabel, setWhitelistLabel] = useState('')
  const [whitelistSubmitting, setWhitelistSubmitting] = useState(false)

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true)
      const data = await fetchJson<SummaryData>('/api/admin/ip-security/summary')
      setSummary(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load security summary',
        variant: 'destructive',
      })
    } finally {
      setSummaryLoading(false)
    }
  }, [toast])

  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true)
      const query = buildQueryString({
        page: logPage,
        pageSize: 20,
        search: logSearch,
        activityType: logActivityType === 'all' ? '' : logActivityType,
        status: logStatus === 'all' ? '' : logStatus,
        dateFrom: logDateFrom,
        dateTo: logDateTo,
        sortBy: logSortBy,
        sortOrder: logSortOrder,
      })
      const data = await fetchJson<LogsResponse>(`/api/admin/ip-security/logs?${query}`)
      setLogRows(data.rows)
      setLogTotalPages(data.totalPages)
      setLogTotal(data.total)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load suspicious activity',
        variant: 'destructive',
      })
    } finally {
      setLogsLoading(false)
    }
  }, [
    logPage,
    logSearch,
    logActivityType,
    logStatus,
    logDateFrom,
    logDateTo,
    logSortBy,
    logSortOrder,
    toast,
  ])

  const loadBlocked = useCallback(async () => {
    try {
      setBlockedLoading(true)
      const query = buildQueryString({
        page: blockedPage,
        pageSize: 20,
        search: blockedSearch,
        source: blockedSource === 'all' ? '' : blockedSource,
      })
      const data = await fetchJson<BlockedResponse>(`/api/admin/ip-security/blocked?${query}`)
      setBlockedRows(data.rows)
      setBlockedTotalPages(data.totalPages)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load blocked IPs',
        variant: 'destructive',
      })
    } finally {
      setBlockedLoading(false)
    }
  }, [blockedPage, blockedSearch, blockedSource, toast])

  const loadWhitelist = useCallback(async () => {
    try {
      setWhitelistLoading(true)
      const query = buildQueryString({
        page: whitelistPage,
        pageSize: 20,
        search: whitelistSearch,
      })
      const data = await fetchJson<WhitelistResponse>(`/api/admin/ip-security/whitelist?${query}`)
      setWhitelistRows(data.rows)
      setWhitelistTotalPages(data.totalPages)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load whitelisted IPs',
        variant: 'destructive',
      })
    } finally {
      setWhitelistLoading(false)
    }
  }, [whitelistPage, whitelistSearch, toast])

  const loadAudit = useCallback(async () => {
    try {
      setAuditLoading(true)
      const query = buildQueryString({
        page: auditPage,
        pageSize: 20,
      })
      const data = await fetchJson<AuditResponse>(`/api/admin/ip-security/audit?${query}`)
      setAuditRows(data.rows)
      setAuditTotalPages(data.totalPages)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load security audit log',
        variant: 'destructive',
      })
    } finally {
      setAuditLoading(false)
    }
  }, [auditPage, toast])

  const loadIpDetail = useCallback(
    async (ipAddress: string) => {
      try {
        setDetailLoading(true)
        const query = buildQueryString({ ip: ipAddress })
        const data = await fetchJson<IpDetail>(`/api/admin/ip-security/detail?${query}`)
        setDetailData(data)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load IP details',
          variant: 'destructive',
        })
      } finally {
        setDetailLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    loadBlocked()
  }, [loadBlocked])

  useEffect(() => {
    loadWhitelist()
  }, [loadWhitelist])

  useEffect(() => {
    loadAudit()
  }, [loadAudit])

  const openBlockModal = (ipAddress = '') => {
    setBlockIpAddress(ipAddress)
    setBlockReason('')
    setAlsoBlockSubnet(false)
    setIsBlockModalOpen(true)
  }

  const openWhitelistModal = (ipAddress = '') => {
    setWhitelistIpAddress(ipAddress)
    setWhitelistLabel('')
    setIsWhitelistModalOpen(true)
  }

  const openDetailModal = (ipAddress: string) => {
    setSelectedIp(ipAddress)
    setIsDetailModalOpen(true)
    void loadIpDetail(ipAddress)
  }

  const refreshAll = async () => {
    await Promise.all([loadSummary(), loadLogs(), loadBlocked(), loadWhitelist(), loadAudit()])
  }

  const handleManualBlock = async () => {
    const normalizedIp = blockIpAddress.trim()
    if (!normalizedIp || !IP_PATTERN.test(normalizedIp)) {
      toast({
        title: 'Invalid IP',
        description: 'Please enter a valid IPv4 or IPv6 address.',
        variant: 'destructive',
      })
      return
    }
    if (!blockReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for blocking this IP.',
        variant: 'destructive',
      })
      return
    }

    try {
      setBlockSubmitting(true)
      await fetchJson('/api/admin/ip-security/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: normalizedIp,
          reason: blockReason.trim(),
          alsoBlockSubnet,
        }),
      })
      toast({
        title: 'Success',
        description: `IP ${normalizedIp} has been permanently blocked`,
      })
      setIsBlockModalOpen(false)
      await refreshAll()
      if (selectedIp && selectedIp === normalizedIp) {
        await loadIpDetail(selectedIp)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to block IP',
        variant: 'destructive',
      })
    } finally {
      setBlockSubmitting(false)
    }
  }

  const handleUnblock = async (blockedId: string, ipAddress: string) => {
    try {
      await fetchJson(`/api/admin/ip-security/blocked/${blockedId}`, {
        method: 'PATCH',
      })
      toast({
        title: 'Success',
        description: `IP ${ipAddress} has been unblocked and can now access the platform`,
      })
      await refreshAll()
      if (selectedIp && selectedIp === ipAddress) {
        await loadIpDetail(selectedIp)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unblock IP',
        variant: 'destructive',
      })
    }
  }

  const handleAddWhitelist = async (ipAddress?: string, label?: string) => {
    const targetIp = (ipAddress || whitelistIpAddress).trim()
    const targetLabel = (label ?? whitelistLabel).trim()

    if (!targetIp || !IP_PATTERN.test(targetIp)) {
      toast({
        title: 'Invalid IP',
        description: 'Please enter a valid IPv4 or IPv6 address.',
        variant: 'destructive',
      })
      return
    }

    try {
      setWhitelistSubmitting(true)
      await fetchJson('/api/admin/ip-security/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: targetIp,
          label: targetLabel || null,
        }),
      })
      toast({
        title: 'Success',
        description: `IP ${targetIp} added to whitelist`,
      })
      setIsWhitelistModalOpen(false)
      await refreshAll()
      if (selectedIp && selectedIp === targetIp) {
        await loadIpDetail(selectedIp)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to whitelist IP',
        variant: 'destructive',
      })
    } finally {
      setWhitelistSubmitting(false)
    }
  }

  const handleRemoveWhitelist = async (id: string, ipAddress: string) => {
    try {
      await fetchJson(`/api/admin/ip-security/whitelist/${id}`, { method: 'DELETE' })
      toast({
        title: 'Removed',
        description: `IP ${ipAddress} removed from whitelist`,
      })
      await refreshAll()
      if (selectedIp && selectedIp === ipAddress) {
        await loadIpDetail(selectedIp)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove whitelist entry',
        variant: 'destructive',
      })
    }
  }

  const toggleLogSort = (column: LogSortColumn) => {
    if (logSortBy === column) {
      setLogSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setLogSortBy(column)
    setLogSortOrder('desc')
  }

  const exportCsv = async () => {
    try {
      const pageSize = 100
      let currentPage = 1
      let totalPages = 1
      const allRows: LogRow[] = []

      while (currentPage <= totalPages) {
        const query = buildQueryString({
          page: currentPage,
          pageSize,
          search: logSearch,
          activityType: logActivityType === 'all' ? '' : logActivityType,
          status: logStatus === 'all' ? '' : logStatus,
          dateFrom: logDateFrom,
          dateTo: logDateTo,
          sortBy: logSortBy,
          sortOrder: logSortOrder,
        })
        const data = await fetchJson<LogsResponse>(`/api/admin/ip-security/logs?${query}`)
        allRows.push(...data.rows)
        totalPages = data.totalPages
        currentPage += 1
      }

      if (allRows.length === 0) {
        toast({
          title: 'No data',
          description: 'No activity log rows to export for current filters.',
        })
        return
      }

      const csvHeader = [
        'IP Address',
        'Activity Type',
        'Target',
        'Attempts Count',
        'First Seen',
        'Last Seen',
        'Status',
      ]
      const csvRows = allRows.map((row) => [
        row.ipAddress,
        ACTIVITY_LABELS[row.activityType],
        row.targetEndpoint || row.targetUserId || '-',
        String(row.attemptsCount),
        formatDateTime(row.firstSeen),
        formatDateTime(row.lastSeen),
        STATUS_LABELS[row.status],
      ])

      const toCsvLine = (cells: string[]) =>
        cells
          .map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`)
          .join(',')

      const csv = [toCsvLine(csvHeader), ...csvRows.map(toCsvLine)].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ip-security-log-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export CSV',
        variant: 'destructive',
      })
    }
  }

  const emptyState = (
    <div className="px-4 py-8 text-center text-text-light">
      No suspicious activity detected. Your platform is secure! ✅
    </div>
  )

  const statCards = useMemo(
    () => [
      {
        title: 'Total Blocked IPs',
        value: summary.blockedCount,
        icon: Ban,
        iconClass: 'text-red-600',
        iconBg: 'bg-red-100',
      },
      {
        title: 'Suspicious IPs',
        value: summary.suspiciousCount,
        icon: AlertTriangle,
        iconClass: 'text-orange-600',
        iconBg: 'bg-orange-100',
      },
      {
        title: 'Failed Login Attempts Today',
        value: summary.failedLoginsToday,
        icon: Lock,
        iconClass: 'text-blue-600',
        iconBg: 'bg-blue-100',
      },
      {
        title: 'Total Security Events',
        value: summary.totalEvents,
        icon: ShieldCheck,
        iconClass: 'text-emerald-600',
        iconBg: 'bg-emerald-100',
      },
    ],
    [summary]
  )

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">IP Security Manager</h1>
              <p className="text-text-light">Monitor threats, block suspicious IPs, and manage security actions.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCsv} className="gap-2">
                <Download size={16} />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => openWhitelistModal()} className="gap-2">
                <UserCheck size={16} />
                Add to Whitelist
              </Button>
              <Button onClick={() => openBlockModal()} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <Plus size={16} />
                Block an IP Manually
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <Card key={card.title} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${card.iconBg}`}>
                      <card.icon size={20} className={card.iconClass} />
                    </div>
                    <div>
                      <p className="text-sm text-text-light">{card.title}</p>
                      <p className="text-2xl font-bold text-text-dark">
                        {summaryLoading ? '...' : card.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-border">
              <TabsTrigger value="activity">Suspicious Activity Log</TabsTrigger>
              <TabsTrigger value="blocked">Permanently Blocked IPs</TabsTrigger>
              <TabsTrigger value="whitelist">Whitelisted IPs</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Suspicious Activity Log</CardTitle>
                  <CardDescription>
                    Review failed logins, brute force attempts, CSRF violations, and XSS attempts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="xl:col-span-2">
                      <Label htmlFor="search-ip">Search by IP</Label>
                      <Input
                        id="search-ip"
                        value={logSearch}
                        onChange={(event) => {
                          setLogSearch(event.target.value)
                          setLogPage(1)
                        }}
                        placeholder="e.g. 103.25.89.12"
                      />
                    </div>
                    <div>
                      <Label>Activity Type</Label>
                      <Select
                        value={logActivityType}
                        onValueChange={(value) => {
                          setLogActivityType(value as 'all' | ActivityType)
                          setLogPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All activity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All activity</SelectItem>
                          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={logStatus}
                        onValueChange={(value) => {
                          setLogStatus(value as 'all' | SecurityStatus)
                          setLogPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All status</SelectItem>
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date From</Label>
                      <Input
                        type="date"
                        value={logDateFrom}
                        onChange={(event) => {
                          setLogDateFrom(event.target.value)
                          setLogPage(1)
                        }}
                      />
                    </div>
                    <div>
                      <Label>Date To</Label>
                      <Input
                        type="date"
                        value={logDateTo}
                        onChange={(event) => {
                          setLogDateTo(event.target.value)
                          setLogPage(1)
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-text-light">Showing {logTotal.toLocaleString()} event(s)</div>

                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">
                            <button type="button" className="font-semibold" onClick={() => toggleLogSort('ipAddress')}>
                              IP Address {logSortBy === 'ipAddress' ? (logSortOrder === 'asc' ? '↑' : '↓') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[220px]">
                            <button type="button" className="font-semibold" onClick={() => toggleLogSort('activityType')}>
                              Activity Type {logSortBy === 'activityType' ? (logSortOrder === 'asc' ? '↑' : '↓') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[220px]">Target</TableHead>
                          <TableHead className="min-w-[120px]">
                            <button type="button" className="font-semibold" onClick={() => toggleLogSort('attemptsCount')}>
                              Attempts {logSortBy === 'attemptsCount' ? (logSortOrder === 'asc' ? '↑' : '↓') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[180px]">
                            <button type="button" className="font-semibold" onClick={() => toggleLogSort('firstSeen')}>
                              First Seen {logSortBy === 'firstSeen' ? (logSortOrder === 'asc' ? '↑' : '↓') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[180px]">
                            <button type="button" className="font-semibold" onClick={() => toggleLogSort('lastSeen')}>
                              Last Seen {logSortBy === 'lastSeen' ? (logSortOrder === 'asc' ? '↑' : '↓') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[140px]">
                            <button type="button" className="font-semibold" onClick={() => toggleLogSort('status')}>
                              Status {logSortBy === 'status' ? (logSortOrder === 'asc' ? '↑' : '↓') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[310px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logsLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-text-light">
                              Loading activity logs...
                            </TableCell>
                          </TableRow>
                        ) : logRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8}>{emptyState}</TableCell>
                          </TableRow>
                        ) : (
                          logRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-slate-50">
                              <TableCell className="font-medium">{row.ipAddress}</TableCell>
                              <TableCell>{ACTIVITY_LABELS[row.activityType]}</TableCell>
                              <TableCell>{row.targetEndpoint || row.targetUserId || '-'}</TableCell>
                              <TableCell>{row.attemptsCount}</TableCell>
                              <TableCell>{formatDateTime(row.firstSeen)}</TableCell>
                              <TableCell>{formatDateTime(row.lastSeen)}</TableCell>
                              <TableCell>{toStatusBadge(row.status)}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                    onClick={() => openBlockModal(row.ipAddress)}
                                  >
                                    Block IP
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => openWhitelistModal(row.ipAddress)}
                                  >
                                    Whitelist IP
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => openDetailModal(row.ipAddress)}>
                                    View Details
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-light">
                      Page {logPage} of {Math.max(1, logTotalPages)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logPage <= 1}
                        onClick={() => setLogPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logPage >= logTotalPages}
                        onClick={() => setLogPage((prev) => Math.min(logTotalPages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blocked">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Permanently Blocked IPs</CardTitle>
                  <CardDescription>All blocked IP addresses across the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Label>Search by IP</Label>
                      <Input
                        value={blockedSearch}
                        onChange={(event) => {
                          setBlockedSearch(event.target.value)
                          setBlockedPage(1)
                        }}
                        placeholder="e.g. 185.191.126.99"
                      />
                    </div>
                    <div>
                      <Label>Blocked By</Label>
                      <Select
                        value={blockedSource}
                        onValueChange={(value) => {
                          setBlockedSource(value as 'all' | 'auto' | 'admin')
                          setBlockedPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[160px]">IP Address</TableHead>
                          <TableHead className="min-w-[260px]">Reason for Block</TableHead>
                          <TableHead className="min-w-[120px]">Blocked By</TableHead>
                          <TableHead className="min-w-[180px]">Blocked On</TableHead>
                          <TableHead className="min-w-[150px]">Total Attempts</TableHead>
                          <TableHead className="min-w-[230px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blockedLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-text-light">
                              Loading blocked IPs...
                            </TableCell>
                          </TableRow>
                        ) : blockedRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>{emptyState}</TableCell>
                          </TableRow>
                        ) : (
                          blockedRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-slate-50">
                              <TableCell className="font-medium">{row.ipAddress}</TableCell>
                              <TableCell className="max-w-[320px] whitespace-normal">{row.reason}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    row.blockSource === 'auto'
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-primary-green/10 text-primary-green'
                                  }
                                >
                                  {row.blockSource === 'auto' ? 'Auto' : 'Admin'}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDateTime(row.blockedAt)}</TableCell>
                              <TableCell>{row.totalAttemptsBeforeBlock}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => handleUnblock(row.id, row.ipAddress)}
                                  >
                                    Unblock
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => openDetailModal(row.ipAddress)}>
                                    View Activity
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-light">
                      Page {blockedPage} of {Math.max(1, blockedTotalPages)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={blockedPage <= 1}
                        onClick={() => setBlockedPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={blockedPage >= blockedTotalPages}
                        onClick={() => setBlockedPage((prev) => Math.min(blockedTotalPages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whitelist">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Whitelisted IPs</CardTitle>
                  <CardDescription>
                    Whitelisted IPs are immune to all auto-blocking rules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-w-md">
                    <Label>Search by IP or Label</Label>
                    <Input
                      value={whitelistSearch}
                      onChange={(event) => {
                        setWhitelistSearch(event.target.value)
                        setWhitelistPage(1)
                      }}
                      placeholder="e.g. Admin Office"
                    />
                  </div>

                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">IP Address</TableHead>
                          <TableHead className="min-w-[180px]">Label</TableHead>
                          <TableHead className="min-w-[160px]">Added By</TableHead>
                          <TableHead className="min-w-[180px]">Added On</TableHead>
                          <TableHead className="min-w-[170px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {whitelistLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-text-light">
                              Loading whitelist...
                            </TableCell>
                          </TableRow>
                        ) : whitelistRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>{emptyState}</TableCell>
                          </TableRow>
                        ) : (
                          whitelistRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-slate-50">
                              <TableCell className="font-medium">{row.ipAddress}</TableCell>
                              <TableCell>{row.label || '-'}</TableCell>
                              <TableCell>{row.addedBy}</TableCell>
                              <TableCell>{formatDateTime(row.addedAt)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemoveWhitelist(row.id, row.ipAddress)}
                                >
                                  Remove from Whitelist
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-light">
                      Page {whitelistPage} of {Math.max(1, whitelistTotalPages)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={whitelistPage <= 1}
                        onClick={() => setWhitelistPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={whitelistPage >= whitelistTotalPages}
                        onClick={() => setWhitelistPage((prev) => Math.min(whitelistTotalPages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>IP Security Audit Log</CardTitle>
                  <CardDescription>Every admin security action is recorded here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[170px]">Timestamp</TableHead>
                          <TableHead className="min-w-[150px]">Admin</TableHead>
                          <TableHead className="min-w-[180px]">Action</TableHead>
                          <TableHead className="min-w-[170px]">IP Address</TableHead>
                          <TableHead className="min-w-[220px]">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-text-light">
                              Loading audit logs...
                            </TableCell>
                          </TableRow>
                        ) : auditRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>{emptyState}</TableCell>
                          </TableRow>
                        ) : (
                          auditRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-slate-50">
                              <TableCell>{formatDateTime(row.performedAt)}</TableCell>
                              <TableCell>{row.adminId}</TableCell>
                              <TableCell>{row.action}</TableCell>
                              <TableCell>{row.ipAddress}</TableCell>
                              <TableCell className="max-w-[320px] whitespace-normal">{row.reason || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-light">
                      Page {auditPage} of {Math.max(1, auditTotalPages)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditPage <= 1}
                        onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditPage >= auditTotalPages}
                        onClick={() => setAuditPage((prev) => Math.min(auditTotalPages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Block IP Address</DialogTitle>
            <DialogDescription>
              Permanently block an IP from accessing all routes and API endpoints.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="block-ip">IP Address</Label>
              <Input
                id="block-ip"
                value={blockIpAddress}
                onChange={(event) => setBlockIpAddress(event.target.value)}
                placeholder="e.g. 45.117.22.12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-reason">Reason for blocking</Label>
              <Textarea
                id="block-reason"
                rows={4}
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                placeholder="Why are you blocking this IP?"
              />
            </div>
            <label className="flex items-start gap-3 text-sm text-text-dark">
              <input
                type="checkbox"
                checked={alsoBlockSubnet}
                onChange={(event) => setAlsoBlockSubnet(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>Also block all IPs from the same /24 subnet range</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleManualBlock}
              disabled={blockSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {blockSubmitting ? 'Blocking...' : 'Block IP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWhitelistModalOpen} onOpenChange={setIsWhitelistModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Add IP to Whitelist</DialogTitle>
            <DialogDescription>
              Whitelisted IPs are exempt from all auto-blocking rules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whitelist-ip">IP Address</Label>
              <Input
                id="whitelist-ip"
                value={whitelistIpAddress}
                onChange={(event) => setWhitelistIpAddress(event.target.value)}
                placeholder="e.g. 39.41.74.20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whitelist-label">Label</Label>
              <Input
                id="whitelist-label"
                value={whitelistLabel}
                onChange={(event) => setWhitelistLabel(event.target.value)}
                placeholder="e.g. Admin Office"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWhitelistModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAddWhitelist()}
              disabled={whitelistSubmitting}
              className="bg-primary-green hover:bg-primary-green/90 text-white"
            >
              {whitelistSubmitting ? 'Adding...' : 'Add to Whitelist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="bg-white w-[95vw] max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary-green" size={18} />
              IP Details: {selectedIp}
            </DialogTitle>
            <DialogDescription>
              Full activity timeline, geolocation, and quick security actions.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detailData ? (
            <div className="py-10 text-center text-text-light">Loading IP details...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Country</CardTitle>
                  </CardHeader>
                  <CardContent>{detailData.geo.country}</CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">City</CardTitle>
                  </CardHeader>
                  <CardContent>{detailData.geo.city}</CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">ISP / Organization</CardTitle>
                  </CardHeader>
                  <CardContent className="break-words">{detailData.geo.organization}</CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-text-light">Current Status:</span>
                {detailData.currentStatus === 'whitelisted' ? (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    Whitelisted
                  </Badge>
                ) : detailData.currentStatus === 'blocked' ? (
                  <Badge variant="outline" className="bg-slate-700 text-white border-slate-700">
                    Blocked
                  </Badge>
                ) : detailData.currentStatus === 'active_threat' ? (
                  toStatusBadge('active_threat')
                ) : detailData.currentStatus === 'suspicious' ? (
                  toStatusBadge('suspicious')
                ) : (
                  toStatusBadge('resolved')
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>{detailData.totals.totalRequests.toLocaleString()}</CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Failed Logins</CardTitle>
                  </CardHeader>
                  <CardContent>{detailData.totals.failedLogins.toLocaleString()}</CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Accounts Targeted</CardTitle>
                  </CardHeader>
                  <CardContent>{detailData.totals.accountsTargeted.toLocaleString()}</CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                {detailData.blockedEntry?.isActive ? (
                  <Button
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() =>
                      detailData.blockedEntry
                        ? handleUnblock(detailData.blockedEntry.id, detailData.ipAddress)
                        : null
                    }
                  >
                    <ShieldCheck className="mr-2" size={16} />
                    Unblock This IP
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => openBlockModal(detailData.ipAddress)}
                  >
                    <ShieldX className="mr-2" size={16} />
                    Block This IP
                  </Button>
                )}
                {!detailData.whitelisted ? (
                  <Button
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleAddWhitelist(detailData.ipAddress, 'Marked safe from IP detail')}
                  >
                    <UserCheck className="mr-2" size={16} />
                    Mark as Safe / Whitelist
                  </Button>
                ) : null}
              </div>

              <div className="rounded-md border border-border">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-text-dark">Complete Activity Timeline</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Timestamp</TableHead>
                        <TableHead className="min-w-[220px]">Action</TableHead>
                        <TableHead className="min-w-[220px]">Target</TableHead>
                        <TableHead className="min-w-[120px]">Attempts</TableHead>
                        <TableHead className="min-w-[140px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailData.timeline.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5}>{emptyState}</TableCell>
                        </TableRow>
                      ) : (
                        detailData.timeline.map((event) => (
                          <TableRow key={event.id} className="hover:bg-slate-50">
                            <TableCell>{formatDateTime(event.lastSeen)}</TableCell>
                            <TableCell>{ACTIVITY_LABELS[event.activityType]}</TableCell>
                            <TableCell>{event.targetEndpoint || event.targetUserId || '-'}</TableCell>
                            <TableCell>{event.attemptsCount}</TableCell>
                            <TableCell>{toStatusBadge(event.status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}

