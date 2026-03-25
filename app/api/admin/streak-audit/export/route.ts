export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma, StreakAuditActionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

const MAX_EXPORT_ROWS = 10_000

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

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function toUtcIso(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const search = String(params.get('search') || '').trim()
    const actionTypeRaw = String(params.get('actionType') || '').trim()
    const from = parseDate(params.get('from'))
    const to = parseDate(params.get('to'), true)
    const limitRaw = Number(params.get('limit') || MAX_EXPORT_ROWS)
    const limit = Math.min(MAX_EXPORT_ROWS, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : MAX_EXPORT_ROWS))

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

    const rows = await prisma.streakAuditLog.findMany({
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
      take: limit,
    })

    const header = [
      'Row #',
      'User ID',
      'User Email',
      'User Name',
      'Endpoint',
      'Action Type',
      'Streak Before',
      'Streak After',
      'Credited Date (UTC)',
      'Credited',
      'Timestamp (full datetime UTC)',
    ]

    const lines = [header.join(',')]
    rows.forEach((row, index) => {
      lines.push(
        [
          index + 1,
          row.userId,
          row.user?.email || '',
          row.user?.name || '',
          row.endpoint,
          row.actionType,
          row.streakBefore,
          row.streakAfter,
          toUtcIso(row.creditedDate),
          row.credited,
          toUtcIso(row.createdAt),
        ]
          .map(escapeCsvCell)
          .join(',')
      )
    })

    const today = new Date().toISOString().slice(0, 10)
    const filename = `streak-audit-${today}.csv`

    return new NextResponse(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to export streak audit CSV' },
      { status: 500 }
    )
  }
}
