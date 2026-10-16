export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { gateOrg, getEffectiveSeats, getOrgMemberCount } from '@/lib/org-access'

/**
 * GET /api/org/dashboard
 *
 * Summary for the institute owner/admin/member. Loads even when the
 * subscription has lapsed so the UI can show a renewal notice; the
 * subscriptionStatus field tells the client what to display.
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await gateOrg(request, { allowLapsed: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })
    const { ctx } = gate

    const seatLimit = getEffectiveSeats(ctx.org)
    const memberCount = await getOrgMemberCount(ctx.orgId)

    return NextResponse.json({
      orgId: ctx.orgId,
      role: ctx.role,
      subscriptionStatus: ctx.subscriptionStatus,
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
