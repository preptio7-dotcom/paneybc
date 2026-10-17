/**
 * org-access.ts
 *
 * Reusable access-control helpers for the institute B2B layer.
 * Every helper follows the same pattern as the existing lib/auth.ts
 * and lib/admin-auth.ts utilities — JWT decode first, then DB lookup.
 */

import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import type { OrgRole } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────────────────

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
}

export type SubscriptionStatus = 'active' | 'expired' | 'inactive' | 'none'

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves the organisation membership for the authenticated user.
 * Returns null if the user is not authenticated or not a member of any org.
 */
export async function getOrgForUser(
  request: NextRequest
): Promise<OrgMembershipContext | null> {
  const tokenUser = getCurrentUser(request)
  if (!tokenUser?.userId) return null

  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: tokenUser.userId },
    include: {
      org: {
        include: { subscription: true },
      },
    },
  })

  if (!membership || !membership.org.isActive) {
    if (tokenUser.role === 'super_admin' || tokenUser.role === 'admin') {
      const org = await prisma.organization.findFirst({
        where: { isActive: true },
        include: { subscription: true },
        orderBy: { createdAt: 'desc' },
      })
      if (org) {
        return {
          orgId: org.id,
          userId: tokenUser.userId,
          role: 'owner',
          org: org as OrgWithSubscription,
        }
      }
    }
    return null
  }

  return {
    orgId: membership.orgId,
    userId: membership.userId,
    role: membership.role,
    org: membership.org as OrgWithSubscription,
  }
}

/**
 * Requires that the authenticated user is an org owner or admin.
 * Returns null if the check fails.
 */
export function isOrgAdminRole(role?: string | null) {
  return role === 'owner' || role === 'admin'
}

export async function getOrgAdminMembership(userId: string) {
  return prisma.organizationMembership.findFirst({
    where: {
      userId,
      role: { in: ['admin', 'owner'] },
      org: { isActive: true },
    },
    select: {
      role: true,
      org: { select: { id: true, name: true, slug: true } },
    },
  })
}

export function toPublicOrgSummary(
  membership: Awaited<ReturnType<typeof getOrgAdminMembership>>
) {
  if (!membership) return null
  return {
    id: membership.org.id,
    name: membership.org.name,
    slug: membership.org.slug,
    role: membership.role,
  }
}

export async function requireOrgAdmin(
  request: NextRequest
): Promise<OrgMembershipContext | null> {
  const ctx = await getOrgForUser(request)
  if (!ctx) return null
  if (!isOrgAdminRole(ctx.role)) return null
  return ctx
}

/**
 * Single entry point for institute routes. Checks identity, membership,
 * role and subscription in that order and returns a typed result so each
 * route can respond with the right status and message.
 */
export async function gateOrg(
  request: NextRequest,
  options: OrgGateOptions = {}
): Promise<OrgGateResult> {
  const tokenUser = getCurrentUser(request)
  if (!tokenUser?.userId) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED', error: 'Sign in required' }
  }

  const ctx = await getOrgForUser(request)
  if (!ctx) {
    return { ok: false, status: 403, code: 'NO_ORG', error: 'Not a member of this organization' }
  }

  if (options.adminOnly && !isOrgAdminRole(ctx.role)) {
    return {
      ok: false,
      status: 403,
      code: 'NOT_ADMIN',
      error: 'Only organization owners and admins can do this',
    }
  }

  const subscriptionStatus = getSubscriptionStatus(ctx.org)
  if (!isSubscriptionUsable(subscriptionStatus) && !options.allowLapsed) {
    if (subscriptionStatus === 'expired') {
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

/**
 * Returns the effective seat limit for an org.
 * Falls back to org.maxSeats if no active subscription exists.
 */
export function getEffectiveSeats(org: OrgWithSubscription): number {
  if (org.subscription?.isActive) {
    return org.subscription.seats
  }
  return org.maxSeats
}

/**
 * Returns the count of active members in an org.
 */
export async function getOrgMemberCount(orgId: string): Promise<number> {
  return prisma.organizationMembership.count({ where: { orgId } })
}

/**
 * Checks if adding N more members would exceed the seat limit.
 */
export async function wouldExceedSeats(
  org: OrgWithSubscription,
  adding = 1
): Promise<boolean> {
  const limit = getEffectiveSeats(org)
  const current = await getOrgMemberCount(org.id)
  return current + adding > limit
}

/**
 * Generates a URL-safe slug from an org name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
