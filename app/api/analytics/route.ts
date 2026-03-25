export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'

// POST: Log a new visit
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { path, referrer, userAgent, screenResolution } = body

        // Attempt to get user ID from token if logged in
        let userId = null
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string }
                userId = decoded.userId || null
            } catch (e) {
                // Ignore invalid tokens for analytics
            }
        }

        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

        await prisma.analytics.create({
            data: {
                path,
                referrer,
                userAgent,
                screenResolution,
                ip,
                userId,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Analytics POST error:', error)
        return NextResponse.json({ error: 'Failed to log analytics' }, { status: 500 })
    }
}

// GET: Retrieve analytics for admin
export async function GET(req: Request) {
    try {
        // Verify super admin session
        const cookieStore = await cookies()
        const superAdminToken = cookieStore.get('super_admin_session')?.value
        if (!superAdminToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '7')
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const analytics = await prisma.analytics.findMany({
            where: { createdAt: { gte: startDate } },
            select: { path: true, userAgent: true, createdAt: true },
        })

        const visitsByDayMap = new Map<string, number>()
        const popularPagesMap = new Map<string, number>()
        const deviceMap = new Map<string, number>()

        analytics.forEach((item) => {
            const dateKey = item.createdAt.toISOString().slice(0, 10)
            visitsByDayMap.set(dateKey, (visitsByDayMap.get(dateKey) || 0) + 1)

            popularPagesMap.set(item.path, (popularPagesMap.get(item.path) || 0) + 1)

            const isMobile = /mobile/i.test(item.userAgent || '')
            const deviceKey = isMobile ? 'Mobile' : 'Desktop'
            deviceMap.set(deviceKey, (deviceMap.get(deviceKey) || 0) + 1)
        })

        const visitsByDay = Array.from(visitsByDayMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }))

        const popularPages = Array.from(popularPagesMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([path, count]) => ({ path, count }))

        const deviceDist = Array.from(deviceMap.entries())
            .map(([name, value]) => ({ name, value }))

        return NextResponse.json({
            visitsByDay,
            popularPages,
            deviceDist,
        })
    } catch (error: any) {
        console.error('Analytics GET error:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}

