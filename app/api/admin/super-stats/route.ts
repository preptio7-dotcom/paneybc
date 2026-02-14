export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    try {
        // Verify super admin session
        const cookieStore = await cookies()
        const superAdminToken = cookieStore.get('super_admin_session')?.value
        if (!superAdminToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Total Counts
        const [totalUsers, totalMessages, totalViews] = await Promise.all([
            prisma.user.count(),
            prisma.contactMessage.count({ where: { status: 'new' } }),
            prisma.analytics.count(),
        ])

        // 2. Recent Messages
        const recentMessages = await prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { name: true, email: true, subject: true, createdAt: true, status: true },
        })

        // 3. Recent Activity (Visits)
        const recentVisits = await prisma.analytics.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { path: true, ip: true, createdAt: true },
        })

        // 4. Analytics Data for Charts
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const [bySubject, byDifficulty, trafficData, settings] = await Promise.all([
            prisma.question.groupBy({ by: ['subject'], _count: { _all: true } }),
            prisma.question.groupBy({ by: ['difficulty'], _count: { _all: true } }),
            prisma.analytics.findMany({
                where: { createdAt: { gte: weekAgo } },
                select: { createdAt: true },
            }),
            prisma.systemSettings.findFirst(),
        ])

        const trafficMap = new Map<string, number>()
        trafficData.forEach((item) => {
            const dateKey = item.createdAt.toISOString().slice(0, 10)
            trafficMap.set(dateKey, (trafficMap.get(dateKey) || 0) + 1)
        })

        const traffic = Array.from(trafficMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }))

        return NextResponse.json({
            stats: {
                totalUsers,
                totalMessages,
                totalViews,
                totalQuestions: await prisma.question.count(),
                isMaintenanceMode: settings?.isMaintenanceMode || false
            },
            recentMessages,
            recentVisits,
            charts: {
                bySubject: bySubject.map(s => ({ name: s.subject, count: s._count?._all || 0 })),
                byDifficulty: byDifficulty.map(d => ({ name: d.difficulty, count: d._count?._all || 0 })),
                traffic
            }
        })
    } catch (error: any) {
        console.error('Admin Stats API error:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
    }
}

