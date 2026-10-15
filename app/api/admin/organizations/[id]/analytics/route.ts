export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildOrgAnalyticsSummary } from '@/lib/org-analytics'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const data = await buildOrgAnalyticsSummary(prisma, id, searchParams.get('range'))
    if (!data) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[admin/organizations/[id]/analytics] GET error:', err)
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 })
  }
}
