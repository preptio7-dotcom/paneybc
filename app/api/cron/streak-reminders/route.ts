export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { sendStreakAtRiskReminders } from '@/lib/streak-reminders'
import { requireAdminUser } from '@/lib/admin-auth'

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.STREAK_RECONCILIATION_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === secret) return true

  return false
}

async function run(options: { limit?: number; dryRun?: boolean; emailFallback?: boolean }) {
  const result = await sendStreakAtRiskReminders(options)
  return NextResponse.json({ success: true, ...result })
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return await run({})
  } catch (error: any) {
    console.error('[cron/streak-reminders] failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to send streak reminders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Admin manual run, or an authorised cron. Supports { dryRun: true } so the
  // admin can safely preview how many nudges would go out.
  const admin = requireAdminUser(request)
  if (!admin && !hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    let options: { limit?: number; dryRun?: boolean; emailFallback?: boolean } = {}
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        if (typeof body.limit === 'number') options.limit = body.limit
        if (typeof body.dryRun === 'boolean') options.dryRun = body.dryRun
        if (typeof body.emailFallback === 'boolean') options.emailFallback = body.emailFallback
      }
    } catch {
      // no body
    }
    return await run(options)
  } catch (error: any) {
    console.error('[cron/streak-reminders] manual failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to send streak reminders' }, { status: 500 })
  }
}
