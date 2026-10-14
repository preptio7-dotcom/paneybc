'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Building2,
  Crown,
  Loader2,
  Mail,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react'

type OrgPlanTier = 'starter' | 'professional' | 'enterprise'

type OrgDetail = {
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
  updatedAt: string
}

type Member = {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
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

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Editable fields
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editSeats, setEditSeats] = useState(30)
  const [editPlan, setEditPlan] = useState<OrgPlanTier>('starter')
  const [editActive, setEditActive] = useState(true)

  // Add member
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'admin'>('member')
  const [isAddingMember, setIsAddingMember] = useState(false)

  const loadOrg = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/admin/organizations/${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load organization')

      const o = data.org
      setOrg(o)
      setEditName(o.name)
      setEditEmail(o.contactEmail || '')
      setEditSeats(o.maxSeats)
      setEditPlan(o.planTier)
      setEditActive(o.isActive)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast])

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${id}/members`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setMembers(data.members ?? [])
    } catch {
      // silent — members section just shows empty
    }
  }, [id])

  useEffect(() => {
    void loadOrg()
    void loadMembers()
  }, [loadOrg, loadMembers])

  const handleSave = async () => {
    if (!editName.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }
    try {
      setIsSaving(true)
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          contactEmail: editEmail.trim() || null,
          maxSeats: editSeats,
          planTier: editPlan,
          isActive: editActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast({ title: 'Saved', description: 'Organization updated successfully.' })
      void loadOrg()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.'))
      return
    try {
      setIsSaving(true)
      const res = await fetch(`/api/admin/organizations/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      toast({ title: 'Deleted', description: 'Organization has been deleted.' })
      router.push('/admin/organizations')
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
      setIsSaving(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return
    try {
      setIsAddingMember(true)
      const res = await fetch(`/api/admin/organizations/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail.trim(), role: newMemberRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add member')
      toast({ title: 'Added', description: `Member added successfully.` })
      setNewMemberEmail('')
      setNewMemberRole('member')
      setShowAddMember(false)
      void loadMembers()
      void loadOrg()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (userId: string, userName: string | null) => {
    if (!confirm(`Remove ${userName || 'this user'} from the organization?`)) return
    try {
      const res = await fetch(`/api/admin/organizations/${id}/members?userId=${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }
      toast({ title: 'Removed', description: `Member removed.` })
      void loadMembers()
      void loadOrg()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background-light">
        <AdminHeader />
        <div className="pt-[72px] lg:pt-[80px] flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-primary-green" size={40} />
        </div>
      </main>
    )
  }

  if (!org) {
    return (
      <main className="min-h-screen bg-background-light">
        <AdminHeader />
        <div className="pt-[72px] lg:pt-[80px] pb-12">
          <div className="mx-auto max-w-4xl px-4 md:px-6 space-y-6">
            <Link
              href="/admin/organizations"
              className="inline-flex items-center gap-1.5 text-sm text-text-light hover:text-primary-green transition-colors"
            >
              <ArrowLeft size={14} /> Back to Organizations
            </Link>
            <p className="text-text-light">Organization not found.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="mx-auto max-w-4xl space-y-6 px-4 md:px-6">
          {/* Back link */}
          <Link
            href="/admin/organizations"
            className="inline-flex items-center gap-1.5 text-sm text-text-light hover:text-primary-green transition-colors"
          >
            <ArrowLeft size={14} /> Back to Organizations
          </Link>

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-bold text-text-dark flex items-center gap-2">
                <Building2 className="text-primary-green" size={28} />
                {org.name}
              </h1>
              <p className="text-text-light text-sm">
                Slug: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{org.slug}</code>
                {' · '}
                Created {new Date(org.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                PLAN_COLORS[org.planTier]
              }`}
            >
              {PLAN_LABELS[org.planTier]}
            </span>
          </div>

          {/* Edit Details Card */}
          <Card className="border-border-light shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-dark">Name *</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Organization name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-dark">Contact Email</label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-dark">Plan Tier</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as OrgPlanTier)}
                    className="flex h-10 w-full rounded-md border border-border-light bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green/30"
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-dark">Seat Limit</label>
                  <Input
                    type="number"
                    min={1}
                    value={editSeats}
                    onChange={(e) => setEditSeats(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-text-dark">Active</label>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editActive ? 'bg-primary-green' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-text-light">
                  {editActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1.5" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Delete Organization
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Members Card */}
          <Card className="border-border-light shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={18} />
                Members ({members.length}/{org.maxSeats})
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                {showAddMember ? (
                  <>
                    <X size={14} className="mr-1.5" /> Cancel
                  </>
                ) : (
                  <>
                    <Plus size={14} className="mr-1.5" /> Add Member
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add member form */}
              {showAddMember && (
                <div className="rounded-lg border border-border-light bg-slate-50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-text-dark">Add a member by email</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="flex-1"
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as 'member' | 'admin')}
                      className="h-10 rounded-md border border-border-light bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green/30"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={handleAddMember}
                      disabled={isAddingMember || !newMemberEmail.trim()}
                    >
                      {isAddingMember ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        'Add'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Members list */}
              {members.length === 0 ? (
                <p className="text-sm text-text-light text-center py-6">
                  No members yet. Add members using the button above.
                </p>
              ) : (
                <div className="divide-y divide-border-light rounded-lg border border-border-light overflow-hidden">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green text-sm font-bold">
                          {(m.user.name || m.user.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-dark">
                            {m.user.name || 'Unnamed'}
                          </p>
                          <p className="text-xs text-text-light flex items-center gap-1">
                            <Mail size={10} />
                            {m.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.role === 'admin'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {m.role === 'admin' && <Crown size={10} />}
                          {m.role}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(m.user.id, m.user.name)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1"
                          title="Remove member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
