export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getIpAccess, getRequestIpAddress } from '@/lib/ip-security'

export async function GET(request: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(request)
    const access = await getIpAccess(ipAddress)

    return NextResponse.json(
      {
        ipAddress: access.ipAddress,
        isWhitelisted: access.isWhitelisted,
        isBlocked: access.isBlocked,
        blockedReason: access.blockedEntry?.reason || null,
        blockedBy: access.blockedEntry?.blockedBy || null,
        blockSource: access.blockedEntry?.blockSource || null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        isWhitelisted: false,
        isBlocked: false,
        blockedReason: null,
        blockedBy: null,
        blockSource: null,
        error: error.message || 'Failed to check IP security access',
      },
      { status: 500 }
    )
  }
}
