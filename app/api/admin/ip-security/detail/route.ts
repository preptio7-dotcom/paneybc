export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { getBlockedIpEntry, isValidIpAddress, isWhitelistedIp, normalizeIpAddress } from '@/lib/ip-security'

async function fetchIpGeoInfo(ipAddress: string) {
  try {
    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ipAddress)}/json`, {
      cache: 'no-store',
    })
    if (!response.ok) return null
    const data = await response.json()
    return {
      country: data?.country || 'Unknown',
      city: data?.city || 'Unknown',
      organization: data?.org || 'Unknown',
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipAddress = normalizeIpAddress(String(request.nextUrl.searchParams.get('ip') || ''))
    if (!isValidIpAddress(ipAddress)) {
      return NextResponse.json({ error: 'Invalid IP address' }, { status: 400 })
    }

    const [timeline, blockedEntry, whitelisted, geo] = await Promise.all([
      prisma.ipActivityLog.findMany({
        where: { ipAddress },
        orderBy: { lastSeen: 'desc' },
        take: 200,
      }),
      getBlockedIpEntry(ipAddress),
      isWhitelistedIp(ipAddress),
      fetchIpGeoInfo(ipAddress),
    ])

    const totalRequests = timeline.reduce((sum, item) => sum + item.attemptsCount, 0)
    const failedLogins = timeline
      .filter((item) => item.activityType === 'failed_login')
      .reduce((sum, item) => sum + item.attemptsCount, 0)
    const accountsTargeted = new Set(
      timeline.map((item) => item.targetUserId).filter(Boolean) as string[]
    ).size

    const currentStatus = blockedEntry?.isActive
      ? 'blocked'
      : whitelisted
        ? 'whitelisted'
        : timeline[0]?.status || 'resolved'

    return NextResponse.json({
      ipAddress,
      geo: geo || {
        country: 'Unknown',
        city: 'Unknown',
        organization: 'Unknown',
      },
      currentStatus,
      blockedEntry,
      whitelisted,
      timeline,
      totals: {
        totalRequests,
        failedLogins,
        accountsTargeted,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load IP details' },
      { status: 500 }
    )
  }
}
