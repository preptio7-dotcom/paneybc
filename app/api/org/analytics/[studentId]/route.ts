export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gateOrg } from '@/lib/org-access'
import { buildInstituteStudentAnalytics } from '@/lib/org-analytics'

type Params = { params: Promise<{ studentId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const gate = await gateOrg(request, { adminOnly: true })
    if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status })
    const { ctx } = gate

    const { studentId } = await params
    const { searchParams } = new URL(request.url)
    const data = await buildInstituteStudentAnalytics(prisma, ctx.orgId, studentId, searchParams.get('range'))

    if ('error' in data) {
      if (data.error === 'NOT_MEMBER') {
        return NextResponse.json({ error: 'Student is not a member of this organization' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'This student has not agreed to share their results', code: 'NO_CONSENT' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { org: { id: ctx.org.id, name: ctx.org.name }, ...data },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[org/analytics/student] GET error:', err)
    return NextResponse.json({ error: 'Failed to load student analytics' }, { status: 500 })
  }
}
