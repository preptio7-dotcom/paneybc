export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    try {
        // 1. Verify admin session
        const user = getCurrentUser(req)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Fetch Counts
        const [totalQuestions, totalSubjects, totalResults, totalUsers] = await Promise.all([
            prisma.question.count(),
            prisma.subject.count(),
            prisma.testResult.count(),
            prisma.user.count(),
        ])

        return NextResponse.json({
            stats: {
                totalQuestions,
                totalSubjects,
                totalResults,
                totalUsers
            }
        })
    } catch (error: any) {
        console.error('Regular Admin Stats API error:', error)
        return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
    }
}

