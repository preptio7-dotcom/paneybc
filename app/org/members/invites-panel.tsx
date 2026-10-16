'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, X } from 'lucide-react'

type Invite = {
  id: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

const STATUS_STYLE: Record<Invite['status'], string> = {
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  expired: 'bg-slate-50 text-slate-500 border-slate-200',
}

export function InvitesPanel({ onChanged }: { onChanged?: () => void }) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/org/invites', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setInvites(data.invites ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function send() {
    const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
    if (list.length === 0) return
    setSending(true)
    setMessage(null)
    const res = await fetch('/api/org/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: list, role }),
    })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) {
      setMessage(data.error || 'Could not send invitations')
      return
    }
    const c = data.counts || {}
    setMessage(
      `Sent ${c.sent || 0}. ${c.already_member ? `${c.already_member} already members. ` : ''}${
        c.email_failed ? `${c.email_failed} emails failed. ` : ''
      }${c.invalid_email ? `${c.invalid_email} invalid addresses.` : ''}`.trim()
    )
    setEmails('')
    await load()
    onChanged?.()
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/org/invites/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
      onChanged?.()
    }
  }

  const pending = invites.filter((i) => i.status === 'pending')

  return (
    <section className="space-y-4 rounded-lg border border-border-light bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-text-dark">Invite students</h3>
        <p className="text-xs text-text-light">
          Students join after they sign in with the invited email and agree to share results from the day they join.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="one@example.com, two@example.com"
          rows={2}
          className="flex-1 rounded-md border border-border-light p-2 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
            className="h-10 rounded-md border border-border-light bg-white px-3 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <Button size="sm" onClick={send} disabled={sending || !emails.trim()}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : 'Send invites'}
          </Button>
        </div>
      </div>
      {message && <p className="text-xs text-text-light">{message}</p>}

      <div className="flex items-center justify-between text-xs text-text-light">
        <span>{pending.length} pending</span>
        <button onClick={load} className="inline-flex items-center gap-1 hover:text-text-dark">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-text-light">Loading invitations…</p>
      ) : invites.length === 0 ? (
        <p className="text-xs text-text-light">No invitations yet.</p>
      ) : (
        <div className="divide-y divide-border-light rounded-md border border-border-light">
          {invites.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-text-dark">{inv.email}</p>
                <p className="text-xs text-text-light">
                  {inv.role} · sent {new Date(inv.createdAt).toLocaleDateString()}
                  {inv.status === 'pending' && ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  {inv.status === 'accepted' && inv.acceptedAt && ` · joined ${new Date(inv.acceptedAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[inv.status]}`}>
                  {inv.status === 'pending' ? 'Awaiting consent' : inv.status === 'accepted' ? 'Consented' : 'Expired'}
                </span>
                {inv.status !== 'accepted' && (
                  <>
                    <button
                      onClick={() => {
                        setEmails(inv.email)
                        setRole(inv.role === 'admin' ? 'admin' : 'member')
                      }}
                      className="text-xs text-primary-green hover:underline"
                    >
                      Resend
                    </button>
                    <button onClick={() => revoke(inv.id)} className="text-red-400 hover:text-red-600" title="Revoke invitation">
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
