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

  if (!membership || !membership.org.isActive) return null

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
export async function requireOrgAdmin(
  request: NextRequest
): Promise<OrgMembershipContext | null> {
  const ctx = await getOrgForUser(request)
  if (!ctx) return null
  if (ctx.role !== 'owner' && ctx.role !== 'admin') return null
  return ctx
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
