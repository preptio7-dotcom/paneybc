export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { processEmailSchedules } from '@/lib/email-campaigns'

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.PUBLISH_SCHEDULED_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === secret) return true

  return false
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processEmailSchedules()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[cron/email-campaigns] failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to run campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
