export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { processActivationEmails } from '@/lib/activation-emails'
import { sendStreakAtRiskReminders } from '@/lib/streak-reminders'
import { requireAdminUser } from '@/lib/admin-auth'

function hasValidCronSecret(request: NextRequest) {
  const secret =
    process.env.CRON_SECRET ||
    process.env.PUBLISH_SCHEDULED_SECRET ||
    process.env.STREAK_RECONCILIATION_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === secret) return true

  return false
}

async function run(options: { dryRun?: boolean } = {}) {
  const [activation, streaks] = await Promise.all([
    processActivationEmails().catch((error) => {
      console.error('[cron/retention] activation emails failed:', error)
      return { error: error?.message || 'activation failed' }
    }),
    sendStreakAtRiskReminders({ dryRun: options.dryRun }).catch((error) => {
      console.error('[cron/retention] streak reminders failed:', error)
      return { error: error?.message || 'streak reminders failed' }
    }),
  ])

  return NextResponse.json({ success: true, activation, streaks })
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return await run()
  } catch (error: any) {
    console.error('[cron/retention] failed:', error)
    return NextResponse.json({ error: error?.message || 'Retention job failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin && !hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    let dryRun = false
    try {
      const body = await request.json()
      dryRun = !!body?.dryRun
    } catch {
      // no body
    }
    return await run({ dryRun })
  } catch (error: any) {
    console.error('[cron/retention] manual failed:', error)
    return NextResponse.json({ error: error?.message || 'Retention job failed' }, { status: 500 })
  }
}
