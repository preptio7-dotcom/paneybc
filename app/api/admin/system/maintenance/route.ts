export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invalidateCache } from '@/lib/cache'

export async function GET() {
  // Admin-only, low traffic — no caching needed, always serve live data
  try {
    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { isMaintenanceMode: false },
      })
    }
    return NextResponse.json({ isMaintenanceMode: settings.isMaintenanceMode })
  } catch (error) {
    return NextResponse.json({ isMaintenanceMode: false }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const superAdminCookie = request.headers
      .get('cookie')
      ?.includes('super_admin_session')

    if (!superAdminCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { enabled } = await request.json()
    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { isMaintenanceMode: enabled },
      })
    } else {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { isMaintenanceMode: enabled },
      })
    }

    // ── Cache invalidation ──────────────────────────────────────────────────
    // Maintenance mode changed — users must see the new status within seconds
    // Clear both so the next request fetches fresh from DB immediately
    invalidateCache('public:maintenance-status')
    invalidateCache('public:settings:')

    if (!enabled) {
      try {
        const { broadcastBackOnline } = await import('@/lib/push-notifications')
        await broadcastBackOnline()
      } catch (error) {
        console.error('Push notification broadcast failed:', error)
      }
    }

    return NextResponse.json({
      success: true,
      isMaintenanceMode: settings.isMaintenanceMode,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}