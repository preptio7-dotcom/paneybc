export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma, StreakAuditActionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

const DEFAULT_PAGE_SIZE = 20

function parseDate(value: string | null, end = false) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  if (end) {
    parsed.setHours(23, 59, 59, 999)
  } else {
    parsed.setHours(0, 0, 0, 0)
  }
  return parsed
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const page = Math.max(1, Number(params.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize') || DEFAULT_PAGE_SIZE)))
    const search = String(params.get('search') || '').trim()
    const actionTypeRaw = String(params.get('actionType') || '').trim()
    const from = parseDate(params.get('from'))
    const to = parseDate(params.get('to'), true)

    const where: Prisma.StreakAuditLogWhereInput = {}
    if (search) {
      where.OR = [
        { userId: { contains: search } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (actionTypeRaw && Object.values(StreakAuditActionType).includes(actionTypeRaw as StreakAuditActionType)) {
      where.actionType = actionTypeRaw as StreakAuditActionType
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    }

    const [total, rows, lastReconciliationLog] = await Promise.all([
      prisma.streakAuditLog.count({ where }),
      prisma.streakAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminAuditLog.findFirst({
        where: { action: 'STREAK_RECONCILIATION_RUN' },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const metadata =
      lastReconciliationLog?.metadata &&
      typeof lastReconciliationLog.metadata === 'object' &&
      !Array.isArray(lastReconciliationLog.metadata)
        ? (lastReconciliationLog.metadata as Record<string, any>)
        : {}

    const lastReconciliationRun = lastReconciliationLog
      ? {
          runAt: String(metadata.runAt || lastReconciliationLog.createdAt.toISOString()),
          triggeredBy: String(metadata.triggeredBy || 'cron_auto'),
          usersAffected: Number(metadata.usersAffected || 0),
          status: String(metadata.status || 'success'),
        }
      : null

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      rows,
      lastReconciliationRun,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load streak audit logs' },
      { status: 500 }
    )
  }
}
