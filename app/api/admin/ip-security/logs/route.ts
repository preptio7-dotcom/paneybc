export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma, SecurityActivityType, SecurityEventStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

const DEFAULT_PAGE_SIZE = 20

const sortableColumns = new Set([
  'ipAddress',
  'activityType',
  'attemptsCount',
  'firstSeen',
  'lastSeen',
  'status',
  'createdAt',
])

function parseDateValue(value: string | null, isEnd = false) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (isEnd) {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return date
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE)))
    const search = String(searchParams.get('search') || '').trim()
    const activityType = String(searchParams.get('activityType') || '').trim()
    const status = String(searchParams.get('status') || '').trim()
    const dateFrom = parseDateValue(searchParams.get('dateFrom'))
    const dateTo = parseDateValue(searchParams.get('dateTo'), true)
    const sortByRaw = String(searchParams.get('sortBy') || 'lastSeen').trim()
    const sortOrderRaw = String(searchParams.get('sortOrder') || 'desc').trim().toLowerCase()
    const sortBy = sortableColumns.has(sortByRaw) ? sortByRaw : 'lastSeen'
    const sortOrder = sortOrderRaw === 'asc' ? 'asc' : 'desc'

    const where: Prisma.IpActivityLogWhereInput = {}
    if (search) {
      where.ipAddress = { contains: search, mode: 'insensitive' }
    }
    if (activityType && Object.values(SecurityActivityType).includes(activityType as SecurityActivityType)) {
      where.activityType = activityType as SecurityActivityType
    }
    if (status && Object.values(SecurityEventStatus).includes(status as SecurityEventStatus)) {
      where.status = status as SecurityEventStatus
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      }
    }

    const [total, rows] = await Promise.all([
      prisma.ipActivityLog.count({ where }),
      prisma.ipActivityLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      rows,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load suspicious activity log' },
      { status: 500 }
    )
  }
}
