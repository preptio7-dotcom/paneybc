export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAdmin, getEffectiveSeats, getOrgMemberCount } from '@/lib/org-access'

/**
 * GET /api/org/dashboard
 *
 * Returns a summary of the org for the currently logged-in institute admin or owner.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgAdmin(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Only organization admins can access this portal' }, { status: 403 })
    }

    const seatLimit = getEffectiveSeats(ctx.org)
    const memberCount = await getOrgMemberCount(ctx.orgId)

    return NextResponse.json({
      orgId: ctx.orgId,
      role: ctx.role,
      org: {
        id: ctx.org.id,
        name: ctx.org.name,
        slug: ctx.org.slug,
        planTier: ctx.org.planTier,
        isActive: ctx.org.isActive,
        contactEmail: ctx.org.contactEmail,
        subscription: ctx.org.subscription
          ? {
              planTier: ctx.org.subscription.planTier,
              seats: ctx.org.subscription.seats,
              isActive: ctx.org.subscription.isActive,
              validUntil: ctx.org.subscription.validUntil,
            }
          : null,
      },
      seats: {
        limit: seatLimit,
        used: memberCount,
        available: Math.max(0, seatLimit - memberCount),
      },
    })
  } catch (err) {
    console.error('[org/dashboard] GET error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
