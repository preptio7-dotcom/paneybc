export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import {
  blockIpWithOptionalSubnet,
  isValidIpAddress,
  normalizeIpAddress,
  recordIpSecurityAudit,
} from '@/lib/ip-security'

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
    const source = String(searchParams.get('source') || '').trim().toLowerCase()

    const where: Prisma.BlockedIpWhereInput = { isActive: true }
    if (search) {
      where.ipAddress = { contains: search, mode: 'insensitive' }
    }
    if (source === 'auto' || source === 'admin') {
      where.blockSource = source
    }

    const [total, rows] = await Promise.all([
      prisma.blockedIp.count({ where }),
      prisma.blockedIp.findMany({
        where,
        orderBy: { blockedAt: 'desc' },
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
      { error: error.message || 'Failed to load blocked IPs' },
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
    const reason = String(body?.reason || '').trim().slice(0, 500)
    const alsoBlockSubnet = Boolean(body?.alsoBlockSubnet)

    if (!isValidIpAddress(ipAddress)) {
      return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const blockedEntries = await blockIpWithOptionalSubnet({
      ipAddress,
      reason,
      blockedBy: admin.userId,
      blockSource: 'admin',
      alsoBlockSubnet,
    })

    await recordIpSecurityAudit({
      adminId: admin.userId,
      action: 'BLOCK_IP_MANUAL',
      ipAddress,
      reason,
      metadata: {
        alsoBlockSubnet,
        blockedEntryIds: blockedEntries.map((entry) => entry.id),
      },
    })

    return NextResponse.json({
      success: true,
      blockedEntries,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to block IP address' },
      { status: 500 }
    )
  }
}
