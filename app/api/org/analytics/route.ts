export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gateOrg } from '@/lib/org-access'
import { buildOrgAnalyticsSummary } from '@/lib/org-analytics'

/**
 * GET /api/org/analytics
 *
 * Org-wide summary. Owners and admins only, and only while the subscription is active.
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await gateOrg(request, { adminOnly: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })
    const { ctx } = gate

    const { searchParams } = new URL(request.url)
    const data = await buildOrgAnalyticsSummary(prisma, ctx.orgId, searchParams.get('range'))
    if (!data) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[org/analytics] GET error:', err)
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 })
  }
}
