export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const settings = await prisma.systemSettings.findFirst()
        return NextResponse.json({ isMaintenanceMode: settings?.isMaintenanceMode || false })
    } catch (error) {
        return NextResponse.json({ isMaintenanceMode: false })
    }
}

