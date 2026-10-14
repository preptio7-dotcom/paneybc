export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildAdminAnalyticsReport, parseAdminAnalyticsRange } from '@/lib/admin-analytics-report'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const range = parseAdminAnalyticsRange(request.nextUrl.searchParams)
    const report = await buildAdminAnalyticsReport(prisma, range)

    return NextResponse.json(
      {
        success: true,
        report,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    )
  } catch (error: any) {
    console.error('admin analytics report error:', error)
    return NextResponse.json({ error: 'Failed to load analytics report' }, { status: 500 })
  }
}
