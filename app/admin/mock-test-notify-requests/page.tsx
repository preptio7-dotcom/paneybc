'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCcw, Search } from 'lucide-react'

type NotifyRow = {
  id: string
  createdAt: string
  testType: string
  testName: string
  user: {
    id: string
    name: string
    email: string
    studentRole: string
    joinedAt: string
  } | null
}

type PaginationState = {
  page: number
  limit: number
  total: number
  totalPages: number
}

const TEST_TYPE_OPTIONS = [
  { value: 'all', label: 'All mock tests' },
  { value: 'qafb_mock', label: 'QAFB Mock Test' },
  { value: 'foa_mock', label: 'FOA Mock Test' },
  { value: 'bae_mock', label: 'BAE Mock Test' },
] as const

export default function AdminMockNotifyRequestsPage() {
  const { toast } = useToast()

  const [rows, setRows] = useState<NotifyRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [testType, setTestType] = useState<(typeof TEST_TYPE_OPTIONS)[number]['value']>('qafb_mock')
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  })

  const fetchRows = async (page = pagination.page) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pagination.limit))
      if (searchQuery) params.set('q', searchQuery)
      if (testType !== 'all') params.set('testType', testType)

      const response = await fetch(`/api/admin/mock-test-notify-requests?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load notify requests')
      }

      setRows(Array.isArray(data.rows) ? data.rows : [])
      setPagination((previous) => ({
        ...previous,
        page: Number(data?.pagination?.page || page),
        total: Number(data?.pagination?.total || 0),
        totalPages: Number(data?.pagination?.totalPages || 0),
      }))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load mock notify requests.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchRows(1)
  }, [searchQuery, testType])

  const visibleEmails = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.user?.email?.trim())
            .filter((email): email is string => Boolean(email))
        )
      ),
    [rows]
  )

  const qafbCount = useMemo(
    () => rows.filter((row) => row.testType === 'qafb_mock').length,
    [rows]
  )

  const copyVisibleEmails = async () => {
    if (!visibleEmails.length) return
    try {
      await navigator.clipboard.writeText(visibleEmails.join(', '))
      toast({
        title: 'Copied',
        description: `${visibleEmails.length} email(s) copied.`,
      })
    } catch (error) {
      toast({
        title: 'Unable to copy',
        description: 'Please copy the emails manually.',
        variant: 'destructive',
      })
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-6">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold text-text-dark">
              Mock Test Notify Requests
            </h1>
            <p className="text-text-light">
              View users who asked to be notified when a mock test mode becomes available.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
                  Total Requests
                </p>
                <p className="mt-1 text-2xl font-bold text-text-dark">{pagination.total}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
                  QAFB Requests (Visible)
                </p>
                <p className="mt-1 text-2xl font-bold text-[#ea580c]">{qafbCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
                  Unique Emails (Visible)
                </p>
                <p className="mt-1 text-2xl font-bold text-text-dark">{visibleEmails.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-md">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name or email"
                    className="pl-9"
                  />
                </div>

                <select
                  value={testType}
                  onChange={(event) =>
                    setTestType(event.target.value as (typeof TEST_TYPE_OPTIONS)[number]['value'])
                  }
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                >
                  {TEST_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setPagination((previous) => ({ ...previous, page: 1 }))
                      setSearchQuery(searchInput.trim())
                    }}
                  >
                    Apply
                  </Button>
                  <Button variant="outline" onClick={() => void fetchRows(1)}>
                    <RefreshCcw size={14} className="mr-1.5" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={() => void copyVisibleEmails()}>
                    Copy Visible Emails
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary-green" size={28} />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-text-light">
                  No notify requests found for the selected filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-2 pr-3">Requested At</th>
                        <th className="pb-2 pr-3">Mock Test</th>
                        <th className="pb-2 pr-3">Name</th>
                        <th className="pb-2 pr-3">Email</th>
                        <th className="pb-2 pr-3">Role</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 pr-3">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {row.testName}
                            </span>
                          </td>
                          <td className="py-2 pr-3">{row.user?.name || 'Unknown user'}</td>
                          <td className="py-2 pr-3">{row.user?.email || '--'}</td>
                          <td className="py-2 pr-3 capitalize">{row.user?.studentRole || '--'}</td>
                          <td className="py-2">
                            {row.user?.email ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(row.user?.email || '')
                                    toast({
                                      title: 'Copied',
                                      description: `${row.user?.email} copied.`,
                                    })
                                  } catch {
                                    toast({
                                      title: 'Unable to copy',
                                      description: 'Please copy the email manually.',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                              >
                                Copy Email
                              </Button>
                            ) : (
                              '--'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() => void fetchRows(Math.max(1, pagination.page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() => void fetchRows(Math.min(pagination.totalPages, pagination.page + 1))}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

