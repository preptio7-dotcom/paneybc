export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { updateAdminAdsenseManualRevenue } from '@/lib/admin-analytics-report'

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await request.json().catch(() => ({}))
    const thisMonthPkr = Number(payload?.thisMonthPkr)
    const lastMonthPkr = Number(payload?.lastMonthPkr)

    if (!Number.isFinite(thisMonthPkr) || thisMonthPkr < 0 || !Number.isFinite(lastMonthPkr) || lastMonthPkr < 0) {
      return NextResponse.json(
        { error: 'Please provide valid non-negative values for thisMonthPkr and lastMonthPkr.' },
        { status: 400 }
      )
    }

    const manual = await updateAdminAdsenseManualRevenue(prisma, {
      thisMonthPkr,
      lastMonthPkr,
    })

    return NextResponse.json({ success: true, manual })
  } catch (error: any) {
    console.error('admin analytics adsense save error:', error)
    return NextResponse.json({ error: 'Failed to save AdSense values' }, { status: 500 })
  }
}
