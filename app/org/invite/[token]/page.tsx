'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type Preview =
  | {
      state: 'valid'
      orgName: string
      email: string
      role: string
      expiresAt: string
      /** Whether the invited email already has a Preptio account. */
      accountExists: boolean
      sharing: { visibleFrom: string; includes: string[]; revocable: boolean }
    }
  | { state: 'not_found' | 'accepted' | 'expired' | 'org_unavailable' }

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
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

  // Route signed-out visitors before they ever reach the consent screen:
  //   • invited email has no account  → go straight to signup (email locked)
  //   • invited email already exists  → go to login, then back here to accept
  const signedIn = !authLoading && !!user
  useEffect(() => {
    if (!preview || preview.state !== 'valid') return
    if (signedIn) return // signed-in users see the consent screen below
    if (authLoading) return // wait for auth to settle

    const query = new URLSearchParams()
    if (preview.email) query.set('email', preview.email)
    if (preview.accountExists) {
      query.set('returnTo', `/org/invite/${token}`)
      router.replace(`/auth/login?${query}`)
    } else {
      query.set('inviteToken', token)
      router.replace(`/auth/signup?${query}`)
    }
  }, [preview, signedIn, authLoading, token, router])

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
      // Session expired mid-flow: go to login and come back here afterwards.
      router.push(`/auth/login?${new URLSearchParams({ returnTo: `/org/invite/${token}` })}`)
      return
    }
    if (!res.ok) {
      setError(data.error || 'Could not accept the invitation.')
      setSubmitting(false)
      return
    }
    router.push('/dashboard')
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm space-y-3">
          <p className="font-semibold text-red-600">Unable to load invitation</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-green border-r-transparent" />
          <p className="text-sm text-slate-500">Loading invitation details…</p>
        </div>
      </div>
    )
  }

  if (preview.state !== 'valid') {
    const message: Record<string, { title: string; desc: string }> = {
      not_found: {
        title: 'Invalid Invitation Link',
        desc: 'This invitation link could not be found or has been revoked.',
      },
      accepted: {
        title: 'Already Accepted',
        desc: 'This invitation has already been used to join the organization.',
      },
      expired: {
        title: 'Invitation Expired',
        desc: 'This invitation has expired. Ask your institute administrator to send a new invite.',
      },
      org_unavailable: {
        title: 'Organization Inactive',
        desc: 'This institute’s subscription is currently not active. Please contact your administrator.',
      },
    }
    const stateInfo = message[preview.state] || {
      title: 'Invitation Unavailable',
      desc: 'This invitation link cannot be used right now.',
    }

    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900">{stateInfo.title}</h2>
          <p className="text-sm text-slate-600">{stateInfo.desc}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Signed-out visitors are being routed to signup/login — show a loader rather
  // than the consent button they can't use yet.
  if (!signedIn) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-green border-r-transparent" />
          <p className="text-sm text-slate-500">Taking you to the next step…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-primary-green mx-auto flex items-center justify-center font-bold text-xl mb-3">
            🏢
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Join {preview.orgName} on Preptio
          </h1>
          <p className="text-sm text-slate-600">
            You&apos;ve been invited to join as <span className="font-semibold text-slate-800 capitalize">{preview.role}</span>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">What {preview.orgName} will see:</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Practice results from the day you join onward. Earlier practice history stays strictly private.</span>
            </li>
            {preview.sharing.includes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-200/80">
            Your personal account remains yours. If you ever leave this organization, it immediately stops receiving your results.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-green focus:ring-primary-green/30"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I agree to join <strong>{preview.orgName}</strong> and share my future test progress and analytics with its administrators.
          </span>
        </label>

        {error && (
          <p className="text-xs font-medium text-red-600 text-center">{error}</p>
        )}

        <button
          onClick={accept}
          disabled={!consent || submitting}
          className="w-full rounded-xl bg-primary-green hover:bg-primary-green/90 py-3.5 px-4 font-semibold text-white shadow-sm transition-all hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? 'Joining Organization…' : 'Accept Invitation & Join'}
        </button>
      </div>
    </div>
  )
}
