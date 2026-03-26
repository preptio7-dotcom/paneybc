export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { computeRiskLevel } from '@/lib/risk-engine'

export async function GET(req: NextRequest) {
    try {
        const user = getCurrentUser(req)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search')?.toLowerCase() || ''
        const riskLevelFilter = searchParams.get('riskLevel')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')

        // Using raw SQL for fast aggregations
        // We fetch all matching students (without pagination here) because riskLevel is computed in TS
        const rawStudents: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.city, 
        u."createdAt" as "registeredAt",
        u."practiceStreakCurrent" as streak,
        COALESCE(sq_test.totalAttempts, 0)::int as "totalMCQAttempts",
        COALESCE(sq_test.accuracy, 0)::float as "avgAccuracy",
        GREATEST(sq_test.lastActive, sq_session.lastActive) as "lastActiveAt",
        COALESCE(sq_mock.passRate, 0)::float as "mockPassRate",
        -- Just to display tags
        COALESCE((
          SELECT json_agg(tag) 
          FROM "student_tags" st 
          WHERE st.student_id = u.id
        ), '[]'::json) as tags
      FROM "User" u
      LEFT JOIN (
        SELECT "userId", 
               SUM("totalQuestions") as totalAttempts,
               (SUM("correctAnswers") * 100.0) / NULLIF(SUM("totalQuestions"), 0) as accuracy,
               MAX("createdAt") as lastActive
        FROM "TestResult"
        GROUP BY "userId"
      ) sq_test ON u.id = sq_test."userId"
      LEFT JOIN (
        SELECT "userId", MAX("createdAt") as lastActive
        FROM "StudySession"
        GROUP BY "userId"
      ) sq_session ON u.id = sq_session."userId"
      LEFT JOIN (
        SELECT "userId", 
               (COUNT(*) FILTER (WHERE "scorePercent" >= 50) * 100.0) / NULLIF(COUNT(*), 0) as passRate
        FROM "BaeMockSession"
        WHERE completed = true
        GROUP BY "userId"
      ) sq_mock ON u.id = sq_mock."userId"
      WHERE u.role = 'student'
      ${search ? `AND (LOWER(u.name) LIKE '%${search}%' OR LOWER(u.email) LIKE '%${search}%')` : ''}
    `)

        let processedStudents = rawStudents.map((s) => {
            const riskLevel = computeRiskLevel({
                lastActiveAt: s.lastActiveAt ? new Date(s.lastActiveAt) : null,
                accuracy: s.avgAccuracy || 0,
                mockTestPassRate: s.mockPassRate || 0
            })

            // If user has a manual tag like "at-risk", it can be highlighted
            const tags = Array.isArray(s.tags) ? s.tags : []

            return {
                ...s,
                riskLevel,
                tags
            }
        })

        // Filter by riskLevel if requested
        if (riskLevelFilter && riskLevelFilter !== 'all') {
            processedStudents = processedStudents.filter(s => s.riskLevel === riskLevelFilter)
        }

        // Sort by last active or streak
        processedStudents.sort((a, b) => {
            const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0
            const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0
            return bTime - aTime
        })

        const total = processedStudents.length
        const offset = (page - 1) * limit
        const paginated = processedStudents.slice(offset, offset + limit)

        return NextResponse.json({
            students: paginated,
            total,
            page,
            pages: Math.ceil(total / limit)
        })

    } catch (error) {
        console.error('Admin students API error:', error)
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }
}
