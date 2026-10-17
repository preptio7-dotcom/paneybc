export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { processActivationEmails } from '@/lib/activation-emails'
import { requireAdminUser } from '@/lib/admin-auth'

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.PUBLISH_SCHEDULED_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === secret) return true

  return false
}

async function run(limit?: number) {
  const result = await processActivationEmails({ limit })
  return NextResponse.json({ success: true, ...result })
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return await run()
  } catch (error: any) {
    console.error('[cron/activation-emails] failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to run activation emails' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Allow an admin to trigger the drip manually (e.g. to test the sequence).
  const admin = requireAdminUser(request)
  if (!admin && !hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    let limit: number | undefined
    try {
      const body = await request.json()
      if (body && typeof body.limit === 'number') limit = body.limit
    } catch {
      // no body — run without a limit
    }
    return await run(limit)
  } catch (error: any) {
    console.error('[cron/activation-emails] manual failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to run activation emails' }, { status: 500 })
  }
}
