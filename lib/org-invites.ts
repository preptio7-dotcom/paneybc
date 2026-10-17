import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { sendOrgInviteEmail } from '@/lib/email'
import { resolveAppBaseUrl } from '@/lib/app-url'
import { getSubscriptionStatus, isSubscriptionUsable, type OrgWithSubscription } from '@/lib/org-access'
import type { OrgRole } from '@prisma/client'

export const INVITE_TTL_DAYS = 14
export const MAX_EMAILS_PER_REQUEST = 200

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 254) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type InviteResult = {
  email: string
  status: 'sent' | 'email_failed' | 'already_member' | 'invalid_email'
  inviteId?: string
}

/**
 * Creates or refreshes invites for a list of emails. Re-inviting an email
 * replaces its token, so older links stop working. Seats are NOT reserved
 * here; they are checked when the invite is accepted.
 */
export async function createOrRefreshInvites(args: {
  org: OrgWithSubscription
  actorUserId: string
  role: OrgRole
  emails: unknown[]
}): Promise<InviteResult[]> {
  const results: InviteResult[] = []
  const seen = new Set<string>()
  const valid: string[] = []

  for (const raw of args.emails.slice(0, 200)) {
    const email = normalizeEmail(raw)
    if (!email) {
      results.push({ email: String(raw), status: 'invalid_email' })
      continue
    }
    if (seen.has(email)) continue
    seen.add(email)
    valid.push(email)
  }

  if (valid.length === 0) return results

  // Skip anyone who is already a member of this org.
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: valid, mode: 'insensitive' } },
    select: { id: true, email: true },
  })
  const memberRows = existingUsers.length
    ? await prisma.organizationMembership.findMany({
        where: { orgId: args.org.id, userId: { in: existingUsers.map((u) => u.id) } },
        select: { userId: true },
      })
    : []
  const memberUserIds = new Set(memberRows.map((m) => m.userId))
  const memberEmails = new Set(
    existingUsers.filter((u) => memberUserIds.has(u.id)).map((u) => (u.email || '').toLowerCase())
  )

  const acceptBase = resolveAppBaseUrl()

  for (const email of valid) {
    if (memberEmails.has(email)) {
      results.push({ email, status: 'already_member' })
      continue
    }

    const token = generateInviteToken()
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

    const invite = await prisma.organizationInvite.upsert({
      where: { orgId_email: { orgId: args.org.id, email } },
      create: {
        orgId: args.org.id,
        email,
        role: args.role,
        tokenHash: hashInviteToken(token),
        expiresAt,
        createdBy: args.actorUserId,
      },
      update: {
        role: args.role,
        tokenHash: hashInviteToken(token),
        expiresAt,
        acceptedAt: null,
        createdBy: args.actorUserId,
      },
    })

    try {
      await sendOrgInviteEmail(email, {
        orgName: args.org.name,
        role: args.role,
        acceptUrl: `${acceptBase}/org/invite/${token}`,
        expiresInDays: INVITE_TTL_DAYS,
      })
      results.push({ email, status: 'sent', inviteId: invite.id })
    } catch (err) {
      console.error('[org-invites] email send failed:', err)
      results.push({ email, status: 'email_failed', inviteId: invite.id })
    }
  }

  return results
}

export type InvitePreview =
  | {
      state: 'valid'
      orgName: string
      email: string
      role: OrgRole
      expiresAt: Date
      /** Whether the invited email already has a Preptio account. */
      accountExists: boolean
    }
  | { state: 'not_found' | 'accepted' | 'expired' | 'org_unavailable' }

export async function previewInvite(token: string): Promise<InvitePreview> {
  const invite = await prisma.organizationInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { org: { include: { subscription: true } } },
  })
  if (!invite) return { state: 'not_found' }
  if (invite.acceptedAt) return { state: 'accepted' }
  if (invite.expiresAt.getTime() <= Date.now()) return { state: 'expired' }
  if (!isSubscriptionUsable(getSubscriptionStatus(invite.org))) return { state: 'org_unavailable' }

  // Lets the invite landing page route new emails to signup and existing
  // emails to login before they ever see the consent screen.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: invite.email, mode: 'insensitive' } },
    select: { id: true },
  })

  return {
    state: 'valid',
    orgName: invite.org.name,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    accountExists: Boolean(existingUser),
  }
}

export type AcceptResult =
  | { ok: true; orgId: string }
  | { ok: false; status: 401 | 402 | 403 | 404 | 409 | 410 | 422; code: string; error: string }

/**
 * Accepts an invite for the signed-in user. Requires:
 * - the invite exists, is unused and unexpired
 * - the signed-in account's email matches the invite email
 * - the org subscription is usable
 * - the org has a free seat
 * - explicit consent (checked by the caller)
 */
export async function acceptInvite(args: { token: string; userId: string; consent: boolean }): Promise<AcceptResult> {
  if (!args.consent) {
    return { ok: false, status: 422, code: 'CONSENT_REQUIRED', error: 'You must agree to share your results to join' }
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { tokenHash: hashInviteToken(args.token) },
    include: { org: { include: { subscription: true } } },
  })
  if (!invite) return { ok: false, status: 404, code: 'NOT_FOUND', error: 'Invitation not found' }
  if (invite.acceptedAt) return { ok: false, status: 409, code: 'ALREADY_ACCEPTED', error: 'Invitation already used' }
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 410, code: 'EXPIRED', error: 'Invitation has expired. Ask your institute to resend it.' }
  }

  const user = await prisma.user.findUnique({ where: { id: args.userId }, select: { id: true, email: true } })
  if (!user?.email || user.email.toLowerCase() !== invite.email) {
    return {
      ok: false,
      status: 403,
      code: 'EMAIL_MISMATCH',
      error: 'Sign in with the email address this invitation was sent to',
    }
  }

  if (!isSubscriptionUsable(getSubscriptionStatus(invite.org))) {
    return { ok: false, status: 402, code: 'SUBSCRIPTION_UNAVAILABLE', error: 'This institute subscription is not active' }
  }

  const existing = await prisma.organizationMembership.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
  })

  if (!existing) {
    const seats = invite.org.subscription?.seats ?? invite.org.maxSeats
    const used = await prisma.organizationMembership.count({ where: { orgId: invite.orgId } })
    if (used >= seats) {
      return { ok: false, status: 422, code: 'SEAT_LIMIT', error: 'This institute has no free seats right now' }
    }
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    if (existing) {
      // Already a member: record consent, keep the existing role and join date.
      await tx.organizationMembership.update({
        where: { id: existing.id },
        data: { consentedAt: existing.consentedAt ?? now },
      })
    } else {
      await tx.organizationMembership.create({
        data: {
          orgId: invite.orgId,
          userId: user.id,
          role: invite.role,
          // Join date is the start of what the institute can see.
          joinedAt: now,
          consentedAt: now,
        },
      })
    }
    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: now },
    })
  })

  return { ok: true, orgId: invite.orgId }
}
