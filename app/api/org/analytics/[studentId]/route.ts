export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgAdmin } from '@/lib/org-access'
import { buildDeepPerformanceAnalytics, parseAnalyticsRangeKey } from '@/lib/deep-analytics'

type Params = { params: Promise<{ studentId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgAdmin(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Only org owners and admins can view analytics' }, { status: 403 })
    }

    const { studentId } = await params
    const membership = await prisma.organizationMembership.findFirst({
      where: { orgId: ctx.orgId, userId: studentId },
      select: {
        user: { select: { id: true, name: true, email: true, studentRole: true } },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Student is not a member of this organization' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const range = parseAnalyticsRangeKey(searchParams.get('range'))
    const analytics = await buildDeepPerformanceAnalytics(prisma, studentId, range)

    return NextResponse.json(
      {
        org: { id: ctx.org.id, name: ctx.org.name },
        student: membership.user,
        range,
        analytics: analytics.payload,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[org/analytics/student] GET error:', err)
    return NextResponse.json({ error: 'Failed to load student analytics' }, { status: 500 })
  }
}
