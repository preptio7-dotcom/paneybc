export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/cache'

// ─── Cache TTL ────────────────────────────────────────────────────────────────
// Short TTL — if admin enables maintenance mode, it should kick in fast
const TTL_MAINTENANCE = 60   // 1 minute
const KEY_MAINTENANCE = 'public:maintenance-status'

// Remove force-dynamic — it was preventing any caching at CDN level
// export const dynamic = 'force-dynamic'  ← removed

export async function GET() {
  try {
    const { isMaintenanceMode } = await withCache(
      KEY_MAINTENANCE,
      TTL_MAINTENANCE,
      async () => {
        const settings = await prisma.systemSettings.findFirst()
        return { isMaintenanceMode: settings?.isMaintenanceMode || false }
      }
    )

    return NextResponse.json(
      { isMaintenanceMode },
      {
        headers: {
          // CDN caches for 60s, serves stale for up to 2 min while revalidating
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    return NextResponse.json({ isMaintenanceMode: false })
  }
}