'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Crown,
  Loader2,
  Mail,
  Users,
} from 'lucide-react'

type OrgPlanTier = 'starter' | 'professional' | 'enterprise'

type OrgDashboard = {
  orgId: string
  role: string
  org: {
    id: string
    name: string
    slug: string
    planTier: OrgPlanTier
    isActive: boolean
    contactEmail: string | null
    subscription: {
      planTier: OrgPlanTier
      seats: number
      isActive: boolean
      validUntil: string | null
    } | null
  }
  seats: {
    limit: number
    used: number
    available: number
  }
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

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export default function OrgOverviewPage() {
  const [data, setData] = useState<OrgDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/org/dashboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary-green" size={32} />
      </div>
    )
  }

  if (!data?.org) {
    return <p className="text-text-light text-center py-12">Unable to load organization data.</p>
  }

  const seatPercent = data.seats.limit > 0 ? Math.round((data.seats.used / data.seats.limit) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-text-dark flex items-center gap-2">
            <Building2 className="text-primary-green" size={28} />
            {data.org.name}
          </h1>
          <p className="text-text-light text-sm flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                PLAN_COLORS[data.org.planTier]
              }`}
            >
              {PLAN_LABELS[data.org.planTier]} Plan
            </span>
            <span className="text-slate-300">·</span>
            Your role:{' '}
            <span className="font-semibold text-text-dark flex items-center gap-1">
              {(data.role === 'owner' || data.role === 'admin') && <Crown size={12} className="text-amber-500" />}
              {ROLE_LABELS[data.role] || data.role}
            </span>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border-light shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-green/10 flex items-center justify-center">
                <Users size={20} className="text-primary-green" />
              </div>
              <div>
                <p className="text-sm text-text-light">Members</p>
                <p className="text-2xl font-bold text-text-dark">
                  {data.seats.used}
                  <span className="text-sm font-normal text-text-light"> / {data.seats.limit}</span>
                </p>
              </div>
            </div>
            {/* Seat usage bar */}
            <div className="mt-3">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    seatPercent > 90 ? 'bg-red-500' : seatPercent > 70 ? 'bg-amber-500' : 'bg-primary-green'
                  }`}
                  style={{ width: `${Math.min(seatPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-light mt-1">
                {data.seats.available} seat{data.seats.available !== 1 ? 's' : ''} available
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-light shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Status</p>
                <p className="text-lg font-bold text-text-dark">
                  {data.org.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-500">Inactive</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-light shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Mail size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Contact</p>
                <p className="text-sm font-medium text-text-dark truncate max-w-[180px]">
                  {data.org.contactEmail || 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription info */}
      {data.org.subscription && (
        <Card className="border-border-light shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-text-light">Plan</p>
                <p className="font-semibold text-text-dark">
                  {PLAN_LABELS[data.org.subscription.planTier]}
                </p>
              </div>
              <div>
                <p className="text-text-light">Seats</p>
                <p className="font-semibold text-text-dark">{data.org.subscription.seats}</p>
              </div>
              <div>
                <p className="text-text-light">Status</p>
                <p className={`font-semibold ${data.org.subscription.isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {data.org.subscription.isActive ? 'Active' : 'Expired'}
                </p>
              </div>
              {data.org.subscription.validUntil && (
                <div>
                  <p className="text-text-light">Valid Until</p>
                  <p className="font-semibold text-text-dark">
                    {new Date(data.org.subscription.validUntil).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick info for non-admin members */}
      {data.role === 'member' && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>You&apos;re a member of this organization.</strong> Your practice data and analytics
          are shared with your institute admin. Keep practicing to help your institute shine! 🎯
        </div>
      )}

      {/* Admin hint */}
      {(data.role === 'admin' || data.role === 'owner') && (
        <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-800">
          <strong>You&apos;re an organization admin.</strong> Use the <strong>Members</strong> tab to manage your
          team and the <strong>Analytics</strong> tab to track your institute&apos;s performance.
        </div>
      )}
    </div>
  )
}
