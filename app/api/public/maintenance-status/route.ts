export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_GEO_RESTRICTION_SETTINGS, extractGeoRestrictionSettings } from '@/lib/geo-restriction'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const settings = await prisma.systemSettings.findFirst()
        const savedTestSettings =
            settings?.testSettings && typeof settings.testSettings === 'object' && !Array.isArray(settings.testSettings)
                ? (settings.testSettings as Record<string, unknown>)
                : {}
        const geoRestriction = extractGeoRestrictionSettings(savedTestSettings)

        return NextResponse.json({
            isMaintenanceMode: settings?.isMaintenanceMode || false,
            geoRestriction,
        })
    } catch (error) {
        return NextResponse.json({
            isMaintenanceMode: false,
            geoRestriction: DEFAULT_GEO_RESTRICTION_SETTINGS,
        })
    }
}

