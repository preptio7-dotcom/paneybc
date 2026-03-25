export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { addWhitelistedIp, isValidIpAddress, normalizeIpAddress, recordIpSecurityAudit } from '@/lib/ip-security'

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
    const search = String(searchParams.get('search') || '').trim()

    const where: Prisma.WhitelistedIpWhereInput = {}
    if (search) {
      where.OR = [
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, rows] = await Promise.all([
      prisma.whitelistedIp.count({ where }),
      prisma.whitelistedIp.findMany({
        where,
        orderBy: { addedAt: 'desc' },
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
      { error: error.message || 'Failed to load whitelisted IPs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const ipAddress = normalizeIpAddress(String(body?.ipAddress || ''))
    const label = String(body?.label || '').trim().slice(0, 120) || null

    if (!isValidIpAddress(ipAddress)) {
      return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
    }

    const whitelist = await addWhitelistedIp({
      ipAddress,
      label,
      addedBy: admin.userId,
    })

    await recordIpSecurityAudit({
      adminId: admin.userId,
      action: 'ADD_WHITELIST_IP',
      ipAddress,
      reason: label || 'Whitelisted in admin panel',
      metadata: {
        whitelistId: whitelist.id,
      },
    })

    return NextResponse.json({ success: true, whitelist })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add IP to whitelist' },
      { status: 500 }
    )
  }
}
