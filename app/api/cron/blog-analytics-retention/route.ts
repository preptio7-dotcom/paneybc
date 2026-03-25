export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const incoming = request.headers.get('x-cron-secret')
  if (secret && incoming && incoming === secret) return true
  return Boolean(requireAdminUser(request))
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1)

  const [events, clicks] = await Promise.all([
    prisma.blogAnalyticsEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    }),
    prisma.blogCtaClick.deleteMany({
      where: { clickedAt: { lt: cutoff } },
    }),
  ])

  return NextResponse.json({
    success: true,
    cutoff: cutoff.toISOString(),
    deletedAnalyticsEvents: events.count,
    deletedCtaClicks: clicks.count,
  })
}
