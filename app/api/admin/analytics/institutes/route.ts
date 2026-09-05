import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        if (!requireAdminUser(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        const rawData = await prisma.user.groupBy({
            by: ['institute'],
            where: {
                role: 'student',
                isBanned: false,
                institute: { not: null, notIn: [''] },
            },
            _count: {
                id: true,
            },
            _avg: {
                instituteRating: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 20, // keep the chart looking neat, only top 20
        })

        const chartData = rawData.map((item) => ({
            institute: item.institute,
            students: item._count.id,
            rating: item._avg.instituteRating ? Number(item._avg.instituteRating.toFixed(1)) : 0,
        }))

        return NextResponse.json({ data: chartData })
    } catch (error) {
        console.error('Institute analytics error:', error)
        return NextResponse.json({ error: 'Failed to load institute analytics' }, { status: 500 })
    }
}
