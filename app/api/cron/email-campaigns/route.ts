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
 *   1. streak-at-risk nudges,
 *   2. scheduled email campaigns,
 *   3. the Day 0/1/3/7 activation drip for users who never practised.
 *
 * They run one after another, ordered by urgency, and each job stops at a soft
 * deadline so a slow run exits cleanly and resumes on the next invocation
 * instead of being killed mid-send. The activation drip and streak reminders
 * share the retention email quota; campaigns use their own bulk provider and
 * allowance. Each job is isolated, so a failure in one never prevents the
 * others from running.
 */
async function runRetention() {
  // Soft deadline: stop each job ~50s before the runtime limit so nothing is
  // killed mid-send. Unsent work simply resumes on the next run.
  const deadline = Date.now() + 250_000

  const streaks = await sendStreakAtRiskReminders({ deadline }).catch((error: any) => {
    console.error('[cron/email-campaigns] streak reminders failed:', error)
    return { error: error?.message || 'streak reminders failed' }
  })

  const campaigns = await processEmailSchedules({ deadline }).catch((error: any) => {
    console.error('[cron/email-campaigns] campaigns failed:', error)
    return { error: error?.message || 'campaigns failed' }
  })

  const activation = await processActivationEmails({ deadline }).catch((error: any) => {
    console.error('[cron/email-campaigns] activation drip failed:', error)
    return { error: error?.message || 'activation drip failed' }
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
