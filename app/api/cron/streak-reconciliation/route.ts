export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runDailyStreakReconciliation } from '@/lib/practice-streak'
import { requireAdminUser } from '@/lib/admin-auth'

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.STREAK_RECONCILIATION_SECRET
  if (!secret) return true

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === secret) return true

  return false
}

async function executeReconciliation(source: 'cron' | 'admin') {
  const triggeredBy = source === 'admin' ? 'admin_manual' : 'cron_auto'
  const startedAt = new Date()
  console.log(`[streak-reconciliation] start (${source}) ${startedAt.toISOString()}`)

  const result = await runDailyStreakReconciliation(prisma, startedAt, { triggeredBy })

  const endedAt = new Date()
  console.log(
    `[streak-reconciliation] end (${source}) ${endedAt.toISOString()} timezone=${result.timezone} affected=${result.affectedCount} triggeredBy=${triggeredBy}`
  )

  return {
    success: true,
    source,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    runAt: endedAt.toISOString(),
    timezone: result.timezone,
    usersAffected: result.affectedCount,
    affectedCount: result.affectedCount,
    triggeredBy,
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!hasValidCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await executeReconciliation('cron')
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[streak-reconciliation] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run streak reconciliation' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await executeReconciliation('admin')
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[streak-reconciliation] manual error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run streak reconciliation' },
      { status: 500 }
    )
  }
}
