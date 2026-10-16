'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { authHref } from '@/lib/auth-redirect'

type Preview =
  | {
      state: 'valid'
      orgName: string
      email: string
      role: string
      expiresAt: string
      sharing: { visibleFrom: string; includes: string[]; revocable: boolean }
    }
  | { state: 'not_found' | 'accepted' | 'expired' | 'org_unavailable' }

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token
  const [preview, setPreview] = useState<Preview | null>(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/org/invites/accept?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => setError('Could not load this invitation.'))
  }, [token])

  async function accept() {
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/org/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, consent: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      router.push(authHref('login', `/org/invite/${token}`))
      return
    }
    if (!res.ok) {
      setError(data.error || 'Could not accept the invitation.')
      setSubmitting(false)
      return
    }
    router.push('/org')
  }

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>
  if (!preview) return <div className="p-8 text-center">Loading invitation…</div>
  if (preview.state !== 'valid') {
    const message: Record<string, string> = {
      not_found: 'This invitation link is not valid.',
      accepted: 'This invitation has already been used.',
      expired: 'This invitation has expired. Ask your institute to send a new one.',
      org_unavailable: 'This institute’s subscription is not active right now.',
    }
    return <div className="p-8 text-center">{message[preview.state]}</div>
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <h1 className="text-2xl font-bold">Join {preview.orgName} on Preptio</h1>
      <p>
        {preview.orgName} invited <strong>{preview.email}</strong> to join as {preview.role}.
      </p>

      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="font-semibold">What {preview.orgName} can see</h2>
        <ul className="list-disc pl-5 text-sm">
          <li>Results from the day you join onward. Earlier practice stays private.</li>
          {preview.sharing.includes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm text-slate-600">
          Your personal account is unaffected. If you leave the institute, it stops seeing your new results.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I agree that {preview.orgName} can see the results listed above.
      </label>

      <button
        onClick={accept}
        disabled={!consent || submitting}
        className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Joining…' : 'Accept and join'}
      </button>
    </div>
  )
}
