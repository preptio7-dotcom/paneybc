export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { processEmailSchedules } from '@/lib/email-campaigns'
import { processActivationEmails } from '@/lib/activation-emails'
import { sendStreakAtRiskReminders } from '@/lib/streak-reminders'

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.PUBLISH_SCHEDULED_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === secret) return true

  return false
}

/**
 * Single daily retention run.
 *
 * This endpoint hosts three jobs so the project stays within Vercel's cron
 * limit (Hobby allows 2 cron jobs; the other slot is streak-reconciliation):
 *   1. scheduled email campaigns,
 *   2. the Day 0/1/3/7 activation drip for users who never practised,
 *   3. streak-at-risk push reminders.
 *
 * They run one after another on purpose: the activation drip and the streak
 * reminders share the retention email quota, so running them sequentially
 * (instead of in parallel) keeps the combined total under the cap. Campaigns
 * use their own bulk provider and allowance. Each job is isolated, so a failure
 * in one never prevents the others from running.
 */
async function runRetention() {
  const campaigns = await processEmailSchedules().catch((error: any) => {
    console.error('[cron/email-campaigns] campaigns failed:', error)
    return { error: error?.message || 'campaigns failed' }
  })

  const activation = await processActivationEmails().catch((error: any) => {
    console.error('[cron/email-campaigns] activation drip failed:', error)
    return { error: error?.message || 'activation drip failed' }
  })

  const streaks = await sendStreakAtRiskReminders().catch((error: any) => {
    console.error('[cron/email-campaigns] streak reminders failed:', error)
    return { error: error?.message || 'streak reminders failed' }
  })

  const success = !(campaigns as any)?.error && !(activation as any)?.error && !(streaks as any)?.error

  return NextResponse.json({
    success,
    ...(campaigns as any),
    activation,
    streaks,
  })
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return await runRetention()
  } catch (error: any) {
    console.error('[cron/email-campaigns] failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to run campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
