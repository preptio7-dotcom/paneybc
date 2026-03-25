export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { upsertPlatformDailyStats } from '@/lib/deep-analytics'

type PlatformStatsRunStatus = 'success' | 'failed'
type PlatformStatsTrigger = 'scheduled' | 'manual'

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

async function recordPlatformStatsLastRun(input: {
  status: PlatformStatsRunStatus
  runAt: string
  triggeredBy: PlatformStatsTrigger
  dayKey?: string
  error?: string
}) {
  try {
    const settings = await prisma.systemSettings.findFirst({
      select: {
        id: true,
        testSettings: true,
      },
    })

    const currentTestSettings = asObject(settings?.testSettings)
    const nextTestSettings = {
      ...currentTestSettings,
      platformStatsLastRun: {
        status: input.status,
        runAt: input.runAt,
        triggeredBy: input.triggeredBy,
        ...(input.dayKey ? { dayKey: input.dayKey } : {}),
        ...(input.error ? { error: input.error } : {}),
      },
    }

    if (!settings) {
      await prisma.systemSettings.create({
        data: {
          testSettings: nextTestSettings,
        },
      })
      return
    }

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        testSettings: nextTestSettings,
      },
    })
  } catch (error) {
    console.error('failed to persist platform stats last-run snapshot:', error)
  }
}

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.PLATFORM_STATS_CRON_SECRET
  if (!secret) return true

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === secret) return true

  return false
}

async function runPlatformStatsJob(referenceDate = new Date(), triggeredBy: PlatformStatsTrigger = 'scheduled') {
  const startedAt = new Date()
  const { row, computed } = await upsertPlatformDailyStats(prisma, referenceDate, 'previous')
  const completedAt = new Date()

  const payload = {
    success: true,
    dayKey: row.dayKey,
    timezone: row.timezone,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    metrics: {
      userCount: computed.userCount,
      totalTests: computed.totalTests,
      totalQuestions: computed.totalQuestions,
      overallAccuracy: computed.overallAccuracy,
      avgQuestionsPerDay: computed.avgQuestionsPerDay,
      avgStreak: computed.avgStreak,
      avgTimePerQuestion: computed.avgTimePerQuestion,
    },
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
  }

  await recordPlatformStatsLastRun({
    status: 'success',
    runAt: completedAt.toISOString(),
    triggeredBy,
    dayKey: row.dayKey,
  })

  return payload
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runPlatformStatsJob(new Date(), 'scheduled')
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('platform stats cron failed:', error)
    await recordPlatformStatsLastRun({
      status: 'failed',
      runAt: new Date().toISOString(),
      triggeredBy: 'scheduled',
      error: error?.message ? String(error.message).slice(0, 240) : 'Unknown error',
    })
    return NextResponse.json({ error: 'Failed to refresh platform stats.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidCronSecret(request) && !requireAdminUser(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runPlatformStatsJob(new Date(), 'manual')
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('platform stats manual run failed:', error)
    await recordPlatformStatsLastRun({
      status: 'failed',
      runAt: new Date().toISOString(),
      triggeredBy: 'manual',
      error: error?.message ? String(error.message).slice(0, 240) : 'Unknown error',
    })
    return NextResponse.json({ error: 'Failed to refresh platform stats.' }, { status: 500 })
  }
}
