'use client'

import { useEffect, useState } from 'react'
import { InvitesPanel } from './invites-panel'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Crown,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Member = {
  consentedAt?: string | null
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email?: string
    studentRole?: string | null
    practiceStreakCurrent?: number
    createdAt?: string
  }
}

type OrgDashboard = {
  role: string
  seats: { limit: number; used: number; available: number }
}

export default function OrgMembersPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [orgInfo, setOrgInfo] = useState<OrgDashboard | null>(null)
  const [search, setSearch] = useState('')

  // Add member form (org admins only)
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<'member' | 'admin'>('member')
  const [isAdding, setIsAdding] = useState(false)

  const isPrivileged = orgInfo?.role === 'owner' || orgInfo?.role === 'admin'

  useEffect(() => {
    Promise.all([
      fetch('/api/org/members', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/org/dashboard', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([membersData, dashData]) => {
        setMembers(membersData.members ?? [])
        setOrgInfo(dashData)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const reload = () => {
    setIsLoading(true)
    Promise.all([
      fetch('/api/org/members', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/org/dashboard', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([membersData, dashData]) => {
        setMembers(membersData.members ?? [])
        setOrgInfo(dashData)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  const handleAdd = async () => {
    if (!addEmail.trim()) return
    try {
      setIsAdding(true)
      const res = await fetch('/api/org/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add member')
      toast({ title: 'Added', description: 'Member added successfully.' })
      setAddEmail('')
      setShowAdd(false)
      reload()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (userId: string, name: string | null) => {
    if (!confirm(`Remove ${name || 'this member'} from the organization?`)) return
    try {
      const res = await fetch(`/api/org/members?userId=${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove')
      }
      toast({ title: 'Removed', description: 'Member removed.' })
      reload()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const filtered = search.trim()
    ? members.filter(
        (m) =>
          m.user.name?.toLowerCase().includes(search.toLowerCase()) ||
          m.user.email?.toLowerCase().includes(search.toLowerCase())
      )
    : members

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary-green" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
            <Users size={22} className="text-primary-green" />
            Members
          </h2>
          <p className="text-sm text-text-light">
            {members.length} member{members.length !== 1 ? 's' : ''} · {orgInfo?.seats.available ?? 0} seats available · {members.filter((m) => m.consentedAt).length} of {members.length} consented
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isPrivileged && <InvitesPanel />}

      {/* Members list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-text-light text-center py-12">No members found.</p>
      ) : (
        <div className="divide-y divide-border-light rounded-lg border border-border-light overflow-hidden">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green text-sm font-bold">
                  {(m.user.name || m.user.email || '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-dark">
                    {m.user.name || 'Unnamed'}
                  </p>
                  {m.user.email && (
                    <p className="text-xs text-text-light flex items-center gap-1">
                      <Mail size={10} />
                      {m.user.email}
                    </p>
                  )}
                  {m.user.studentRole && (
                    <p className="text-xs text-text-light">{m.user.studentRole}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isPrivileged && (
                  <Link
                    href={`/org/analytics/${m.user.id}`}
                    className="text-xs font-medium text-primary-green hover:underline"
                  >
                    Analytics
                  </Link>
                )}
                {m.user.practiceStreakCurrent != null && m.user.practiceStreakCurrent > 0 && (
                  <span className="text-xs text-amber-600 font-medium">
                    🔥 {m.user.practiceStreakCurrent} day streak
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.role === 'admin' || m.role === 'owner'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  {(m.role === 'admin' || m.role === 'owner') && <Crown size={10} />}
                  {m.role}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    m.consentedAt
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                  title={m.consentedAt ? `Agreed on ${new Date(m.consentedAt).toLocaleDateString()}` : 'Has not agreed to share results yet'}
                >
                  {m.consentedAt ? 'Consented' : 'No consent'}
                </span>
                {isPrivileged && (
                  <button
                    onClick={() => handleRemove(m.user.id, m.user.name)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
