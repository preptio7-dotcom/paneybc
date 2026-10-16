/**
 * org-access.ts
 *
 * Access control for the institute (organization) layer.
 *
 * Rules:
 * - Identity comes from a signature-verified JWT (getCurrentUser -> verifyToken).
 * - Membership is always looked up for an explicit org (orgId from ?orgId= or
 *   the x-org-id header). If the caller has exactly one membership, that org is
 *   used by default. Ambiguous callers get no org.
 * - Platform admins get NO implicit org access. They manage orgs through
 *   /api/admin/organizations, not through the institute routes.
 * - A subscription must be active and unexpired for institute access.
 *   Only the dashboard may load in a lapsed state so the UI can show a notice.
 */

import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import type { OrgRole } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'expired' | 'inactive' | 'none'

export type OrgWithSubscription = {
  id: string
  name: string
  slug: string
  planTier: string
  maxSeats: number
  isActive: boolean
  contactEmail: string | null
  createdAt: Date
  updatedAt: Date
  subscription: {
    id: string
    planTier: string
    seats: number
    validFrom: Date
    validUntil: Date | null
    isActive: boolean
    notes: string | null
  } | null
}

export type OrgMembershipContext = {
  orgId: string
  userId: string
  role: OrgRole
  org: OrgWithSubscription
  subscriptionStatus: SubscriptionStatus
}

export type OrgGateOptions = {
  /** Only owners and admins may pass. */
  adminOnly?: boolean
  /** Let an org with a lapsed subscription through (dashboard only). */
  allowLapsed?: boolean
}

export type OrgGateResult =
  | { ok: true; ctx: OrgMembershipContext }
  | {
      ok: false
      status: 401 | 402 | 403
      code: 'UNAUTHENTICATED' | 'NO_ORG' | 'NOT_ADMIN' | 'SUBSCRIPTION_EXPIRED' | 'SUBSCRIPTION_INACTIVE'
      error: string
    }

// ─── Subscription status ─────────────────────────────────────────────────────

/**
 * Computes the effective subscription state from the stored row.
 * - inactive: org disabled by platform, or subscription switched off
 * - none: org has no subscription record at all (never paid / not set up)
 * - expired: validUntil is in the past
 * - active: usable
 * A null validUntil means no expiry date was set (open-ended).
 */
export function getSubscriptionStatus(org: OrgWithSubscription, now: Date = new Date()): SubscriptionStatus {
  if (!org.isActive) return 'inactive'
  const sub = org.subscription
  if (!sub) return 'none'
  if (!sub.isActive) return 'inactive'
  if (sub.validUntil && sub.validUntil.getTime() <= now.getTime()) return 'expired'
  return 'active'
}

export function isSubscriptionUsable(status: SubscriptionStatus): boolean {
  return status === 'active'
}

// ─── Org resolution ──────────────────────────────────────────────────────────

function requestedOrgId(request: NextRequest): string | null {
  const fromQuery = new URL(request.url).searchParams.get('orgId')
  const fromHeader = request.headers.get('x-org-id')
  const value = (fromQuery || fromHeader || '').trim()
  return value || null
}

/**
 * Resolves the caller's membership for one org.
 * Returns null when the caller is unauthenticated, not a member of the
 * requested org, or has several memberships and did not say which org.
 */
export async function getOrgForUser(request: NextRequest): Promise<OrgMembershipContext | null> {
  const tokenUser = getCurrentUser(request)
  if (!tokenUser?.userId) return null

  const orgId = requestedOrgId(request)

  type MembershipWithOrg = { orgId: string; userId: string; role: OrgRole; org: OrgWithSubscription }
  let membership: MembershipWithOrg | null = null

  if (orgId) {
    // Tied lookup: membership must exist for this exact (org, user) pair.
    membership = await prisma.organizationMembership.findUnique({
      where: { orgId_userId: { orgId, userId: tokenUser.userId } },
      include: { org: { include: { subscription: true } } },
    })
  } else {
    const memberships = await prisma.organizationMembership.findMany({
      where: { userId: tokenUser.userId },
      include: { org: { include: { subscription: true } } },
      take: 2,
    })
    // Only infer the org when there is exactly one; otherwise the caller must name it.
    if (memberships.length === 1) membership = memberships[0]
  }

  if (!membership) return null

  return {
    orgId: membership.orgId,
    userId: membership.userId,
    role: membership.role,
    org: membership.org,
    subscriptionStatus: getSubscriptionStatus(membership.org),
  }
}

/**
 * Single entry point for institute routes. Checks identity, membership,
 * role and subscription in that order and returns a typed result so each
 * route can respond with the right status and message.
 */
export async function gateOrg(request: NextRequest, options: OrgGateOptions = {}): Promise<OrgGateResult> {
  const tokenUser = getCurrentUser(request)
  if (!tokenUser?.userId) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED', error: 'Sign in required' }
  }

  const ctx = await getOrgForUser(request)
  if (!ctx) {
    return { ok: false, status: 403, code: 'NO_ORG', error: 'Not a member of this organization' }
  }

  if (options.adminOnly && ctx.role !== 'owner' && ctx.role !== 'admin') {
    return { ok: false, status: 403, code: 'NOT_ADMIN', error: 'Only organization owners and admins can do this' }
  }

  if (!isSubscriptionUsable(ctx.subscriptionStatus) && !options.allowLapsed) {
    if (ctx.subscriptionStatus === 'expired') {
      return {
        ok: false,
        status: 402,
        code: 'SUBSCRIPTION_EXPIRED',
        error: 'This institute subscription has expired. Renew to restore access.',
      }
    }
    return {
      ok: false,
      status: 402,
      code: 'SUBSCRIPTION_INACTIVE',
      error: 'This institute subscription is not active. Contact Preptio support.',
    }
  }

  return { ok: true, ctx }
}

// ─── Seats ───────────────────────────────────────────────────────────────────

/**
 * Seat limit for an org. Zero when the subscription is not usable, so lapsed
 * orgs cannot add people. Falls back to maxSeats only for an active subscription
 * with no explicit seat count (should not happen; kept as a safety net).
 */
export function getEffectiveSeats(org: OrgWithSubscription, now: Date = new Date()): number {
  if (!isSubscriptionUsable(getSubscriptionStatus(org, now))) return 0
  return org.subscription?.seats ?? org.maxSeats
}

export async function getOrgMemberCount(orgId: string): Promise<number> {
  return prisma.organizationMembership.count({ where: { orgId } })
}

export async function wouldExceedSeats(org: OrgWithSubscription, adding = 1): Promise<boolean> {
  const limit = getEffectiveSeats(org)
  if (limit === 0) return true
  const current = await getOrgMemberCount(org.id)
  return current + adding > limit
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
