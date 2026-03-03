export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runDailyStreakReconciliation } from '@/lib/practice-streak'
import { requireAdminUser } from '@/lib/admin-auth'

type ReconciliationAuditLogInput = {
  triggeredBy: 'cron_auto' | 'admin_manual'
  status: 'success' | 'failed'
  usersAffected?: number
  timezone?: string
  runAt?: string
  errorMessage?: string
  actor?: {
    id: string
    email: string
    role: string
  }
}

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

async function runBlogAnalyticsRetention() {
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

  return {
    cutoff: cutoff.toISOString(),
    deletedAnalyticsEvents: events.count,
    deletedCtaClicks: clicks.count,
  }
}

async function createReconciliationAuditLog(input: ReconciliationAuditLogInput) {
  const actor = input.actor || {
    id: 'system-cron',
    email: 'system@preptio.local',
    role: 'system',
  }

  await prisma.adminAuditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'STREAK_RECONCILIATION_RUN',
      targetType: 'streak_reconciliation',
      metadata: {
        triggeredBy: input.triggeredBy,
        status: input.status,
        usersAffected: Number(input.usersAffected || 0),
        timezone: input.timezone || null,
        runAt: input.runAt || new Date().toISOString(),
        errorMessage: input.errorMessage || null,
      },
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    if (!hasValidCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await executeReconciliation('cron')
    let retention: Awaited<ReturnType<typeof runBlogAnalyticsRetention>> | null = null
    try {
      retention = await runBlogAnalyticsRetention()
      console.log(
        `[streak-reconciliation] retention cleanup complete analytics=${retention.deletedAnalyticsEvents} ctaClicks=${retention.deletedCtaClicks}`
      )
    } catch (retentionError) {
      console.error('[streak-reconciliation] retention cleanup failed:', retentionError)
    }

    try {
      await createReconciliationAuditLog({
        triggeredBy: 'cron_auto',
        status: 'success',
        usersAffected: payload.usersAffected,
        timezone: payload.timezone,
        runAt: payload.runAt,
      })
    } catch (logError) {
      console.error('[streak-reconciliation] failed to write success audit log:', logError)
    }
    return NextResponse.json({
      ...payload,
      retention,
    })
  } catch (error: any) {
    console.error('[streak-reconciliation] error:', error)
    try {
      await createReconciliationAuditLog({
        triggeredBy: 'cron_auto',
        status: 'failed',
        errorMessage: error.message || 'Unknown reconciliation failure',
      })
    } catch (logError) {
      console.error('[streak-reconciliation] failed to write error audit log:', logError)
    }
    return NextResponse.json(
      { error: error.message || 'Failed to run streak reconciliation' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  const adminActor = admin
    ? {
        id: admin.userId,
        email: admin.email,
        role: admin.role,
      }
    : null

  try {
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await executeReconciliation('admin')
    try {
      await createReconciliationAuditLog({
        triggeredBy: 'admin_manual',
        status: 'success',
        usersAffected: payload.usersAffected,
        timezone: payload.timezone,
        runAt: payload.runAt,
        actor: adminActor || undefined,
      })
    } catch (logError) {
      console.error('[streak-reconciliation] failed to write success audit log:', logError)
    }
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[streak-reconciliation] manual error:', error)
    if (adminActor) {
      try {
        await createReconciliationAuditLog({
          triggeredBy: 'admin_manual',
          status: 'failed',
          errorMessage: error.message || 'Unknown reconciliation failure',
          actor: adminActor,
        })
      } catch (logError) {
        console.error('[streak-reconciliation] failed to write error audit log:', logError)
      }
    }
    return NextResponse.json(
      { error: error.message || 'Failed to run streak reconciliation' },
      { status: 500 }
    )
  }
}
