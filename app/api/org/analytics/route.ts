export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgAdmin } from '@/lib/org-access'
import { buildOrgAnalyticsSummary } from '@/lib/org-analytics'

/**
 * GET /api/org/analytics
 *
 * Lightweight org-wide summary from test results so the institute
 * dashboard loads instead of timing out on per-student deep analytics.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgAdmin(request)
    if (!ctx)
      return NextResponse.json({ error: 'Only org owners and admins can view analytics' }, { status: 403 })

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
