export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { acceptInvite, previewInvite } from '@/lib/org-invites'

/** GET /api/org/invites/accept?token=... — what the invitee is being asked to accept. */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!token || token.length > 200) return NextResponse.json({ state: 'not_found' }, { status: 404 })

  const preview = await previewInvite(token)
  if (preview.state !== 'valid') return NextResponse.json(preview, { status: 200 })

  return NextResponse.json({
    state: 'valid',
    orgName: preview.orgName,
    email: preview.email,
    role: preview.role,
    expiresAt: preview.expiresAt,
    // Used by the landing page to route new emails to signup vs login.
    accountExists: preview.accountExists,
    // Shown on the consent screen so the student knows exactly what is shared.
    sharing: {
      visibleFrom: 'the day you join',
      includes: ['subject-wise question counts', 'accuracy per subject', 'practice streak'],
      revocable: true,
    },
  })
}

/** POST /api/org/invites/accept — body: { token, consent: true }. Requires sign-in. */
export async function POST(request: NextRequest) {
  try {
    const tokenUser = getCurrentUser(request)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Sign in to accept this invitation', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token || token.length > 200) {
      return NextResponse.json({ error: 'Invalid invitation link' }, { status: 400 })
    }

    const result = await acceptInvite({
      token,
      userId: tokenUser.userId,
      consent: body.consent === true,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status })
    }

    return NextResponse.json({ success: true, orgId: result.orgId })
  } catch (err) {
    console.error('[org/invites/accept] POST error:', err)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}
