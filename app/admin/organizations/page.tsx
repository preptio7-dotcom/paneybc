'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Building2,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
} from 'lucide-react'

type OrgPlanTier = 'starter' | 'professional' | 'enterprise'

type OrgRow = {
  id: string
  name: string
  slug: string
  planTier: OrgPlanTier
  maxSeats: number
  isActive: boolean
  contactEmail: string | null
  memberCount: number
  subscription: {
    planTier: OrgPlanTier
    seats: number
    isActive: boolean
    validUntil: string | null
  } | null
  createdAt: string
}

const PLAN_LABELS: Record<OrgPlanTier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const PLAN_COLORS: Record<OrgPlanTier, string> = {
  starter: 'border-slate-200 bg-slate-50 text-slate-700',
  professional: 'border-blue-200 bg-blue-50 text-blue-700',
  enterprise: 'border-purple-200 bg-purple-50 text-purple-700',
}

export default function AdminOrganizationsPage() {
  const { toast } = useToast()
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPlan, setNewPlan] = useState<OrgPlanTier>('starter')
  const [newSeats, setNewSeats] = useState(30)

  const load = useCallback(
    async (search = '') => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams({ limit: '50' })
        if (search) params.set('q', search)
        const res = await fetch(`/api/admin/organizations?${params}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        setOrgs(data.orgs ?? [])
        setTotal(data.total ?? 0)
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    void load()
  }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void load(query.trim())
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      setIsSaving(true)
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          contactEmail: newEmail.trim() || null,
          planTier: newPlan,
          maxSeats: newSeats,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      toast({ title: 'Created', description: `${newName.trim()} has been created.` })
      setNewName('')
      setNewEmail('')
      setNewPlan('starter')
      setNewSeats(30)
      setShowCreate(false)
      void load()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-bold text-text-dark flex items-center gap-2">
                <Building2 className="text-primary-green" size={28} />
                Organizations
              </h1>
              <p className="text-text-light text-sm">
                {total} organization{total !== 1 ? 's' : ''} registered
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void load(query)} disabled={isLoading}>
                <RefreshCcw size={14} className="mr-1.5" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowCreate((v) => !v)} disabled={isSaving}>
                <Plus size={14} className="mr-1.5" />
                {showCreate ? 'Cancel' : 'New Organization'}
              </Button>
            </div>
          </div>

          {/* Create Form */}
          {showCreate && (
            <Card className="border-primary-green/30 bg-green-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Create Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Name *</label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Punjab College of Commerce"
                      maxLength={140}
                      id="org-name-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Contact Email</label>
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="contact@institute.edu"
                      type="email"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Plan Tier</label>
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value as OrgPlanTier)}
                      className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
                    >
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Seat Limit</label>
                    <Input
                      value={newSeats}
                      onChange={(e) => setNewSeats(parseInt(e.target.value) || 30)}
                      type="number"
                      min={1}
                      max={5000}
                      id="org-seats-input"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={isSaving || !newName.trim()}
                  id="org-create-submit"
                >
                  {isSaving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plus size={14} className="mr-1.5" />}
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="max-w-sm"
              id="org-search-input"
            />
            <Button type="submit" variant="outline" size="sm">
              <Search size={14} className="mr-1.5" />
              Search
            </Button>
          </form>

          {/* List */}
          <Card className="border-border">
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-primary-green" size={28} />
                </div>
              ) : orgs.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-light">
                  No organizations found.
                </p>
              ) : (
                <div className="space-y-2">
                  {orgs.map((org) => {
                    const tier = org.planTier
                    const used = org.memberCount
                    const limit = org.subscription?.seats ?? org.maxSeats
                    const utilPct = limit > 0 ? Math.round((used / limit) * 100) : 0
                    return (
                      <Link
                        key={org.id}
                        href={`/admin/organizations/${org.id}`}
                        className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-4 hover:border-primary-green/50 hover:shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-800 truncate">{org.name}</p>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${PLAN_COLORS[tier]}`}
                            >
                              {PLAN_LABELS[tier]}
                            </span>
                            {!org.isActive && (
                              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {used}/{limit} seats used ({utilPct}%)
                            {org.contactEmail ? ` · ${org.contactEmail}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-xs text-slate-500">Manage</span>
                          <ChevronRight size={16} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
