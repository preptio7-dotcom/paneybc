export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import {
  buildAdminAnalyticsCsv,
  buildAdminAnalyticsReport,
  parseAdminAnalyticsRange,
} from '@/lib/admin-analytics-report'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const range = parseAdminAnalyticsRange(request.nextUrl.searchParams)
    const report = await buildAdminAnalyticsReport(prisma, range)
    const csv = buildAdminAnalyticsCsv(report)
    const fileSuffix = range.startInput === range.endInput ? range.startInput : `${range.startInput}_to_${range.endInput}`
    const filename = `preptio-admin-analytics-${fileSuffix}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error: any) {
    console.error('admin analytics export error:', error)
    return NextResponse.json({ error: 'Failed to export analytics' }, { status: 500 })
  }
}
