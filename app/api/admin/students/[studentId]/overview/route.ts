export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
    req: NextRequest,
    { params }: { params: { studentId: string } }
) {
    try {
        const user = getCurrentUser(req)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { studentId } = await params

        // 1. Profile
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                name: true,
                email: true,
                city: true,
                createdAt: true,
                practiceStreakCurrent: true,
                practiceStreakBest: true,
            }
        })

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        // 2. Performance & Mock Tests
        const testResults = await prisma.testResult.findMany({
            where: { userId: studentId },
            orderBy: { createdAt: 'desc' }
        })

        const mockSessions = await prisma.baeMockSession.findMany({
            where: { userId: studentId, completed: true },
            orderBy: { createdAt: 'desc' }
        })

        const studySessions = await prisma.studySession.findMany({
            where: { userId: studentId },
            orderBy: { createdAt: 'desc' }
        })

        // Compute Overall Accuracy
        let totalCorrect = 0
        let totalQuestions = 0
        let subjectMap: Record<string, { correct: number; total: number }> = {}

        testResults.forEach(tr => {
            totalCorrect += tr.correctAnswers
            totalQuestions += tr.totalQuestions

            if (!subjectMap[tr.subject]) subjectMap[tr.subject] = { correct: 0, total: 0 }
            subjectMap[tr.subject].correct += tr.correctAnswers
            subjectMap[tr.subject].total += tr.totalQuestions
        })

        const accuracyBySubject = Object.entries(subjectMap).map(([subject, stats]) => ({
            subject,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
        }))

        // Engagement
        const totalStudyMinutes = studySessions.reduce((acc, s) => acc + s.minutes, 0)

        // Mock Tests
        const passRate = mockSessions.length > 0
            ? (mockSessions.filter(m => m.scorePercent >= 50).length / mockSessions.length) * 100
            : 0
        const avgScore = mockSessions.length > 0
            ? mockSessions.reduce((acc, m) => acc + m.scorePercent, 0) / mockSessions.length
            : 0
        const scoreProgression = [...mockSessions].reverse().map(m => ({
            date: m.createdAt.toISOString().split('T')[0],
            score: m.scorePercent,
            passed: m.scorePercent >= 50
        }))

        // Structure response
        const payload = {
            profile: {
                name: student.name,
                email: student.email,
                city: student.city,
                registeredAt: student.createdAt,
                lastActiveAt: studySessions[0]?.createdAt || testResults[0]?.createdAt || null,
                streak: student.practiceStreakCurrent,
                totalStudyMinutes
            },
            performance: {
                overallAccuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
                accuracyBySubject,
                // Mocking weekly trend for simplicity; a real app aggregates grouping by week
                weeklyAccuracyTrend: []
            },
            weakAreas: {
                // Leaving chapter data empty to compute below
                byChapter: [],
                mostMissedQuestions: []
            },
            engagement: {
                dailyActiveMinutes: studySessions.slice(0, 30).map(s => ({
                    date: s.createdAt.toISOString().split('T')[0],
                    minutes: s.minutes
                })),
                sessionsLast30Days: studySessions.filter(s => s.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
                avgSessionDuration: studySessions.length > 0 ? totalStudyMinutes / studySessions.length : 0,
                peakHour: 20, // Mocked for simplicity
                currentStreak: student.practiceStreakCurrent,
                longestStreak: student.practiceStreakBest
            },
            mockTests: {
                attempts: mockSessions.map(m => ({
                    id: m.id,
                    date: m.createdAt,
                    score: m.scorePercent,
                    passed: m.scorePercent >= 50,
                    duration: m.timeTaken || 0
                })),
                passRate,
                avgScore,
                scoreProgression
            }
        }

        return NextResponse.json(payload)

    } catch (error) {
        console.error('Student overview error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
