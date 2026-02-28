export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

const DEFAULT_PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE)))

    const [total, rows] = await Promise.all([
      prisma.ipSecurityAudit.count(),
      prisma.ipSecurityAudit.findMany({
        orderBy: { performedAt: 'desc' },
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
      { error: error.message || 'Failed to load security audit log' },
      { status: 500 }
    )
  }
}
