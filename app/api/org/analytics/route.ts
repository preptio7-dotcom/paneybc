export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgAdmin } from '@/lib/org-access'
import { buildDeepPerformanceAnalytics, parseAnalyticsRangeKey } from '@/lib/deep-analytics'

/**
 * GET /api/org/analytics
 *
 * Returns aggregated analytics for the org of the logged-in institute owner/admin.
 * Reuses buildDeepPerformanceAnalytics — no analytics logic duplicated.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgAdmin(request)
    if (!ctx)
      return NextResponse.json({ error: 'Only org owners and admins can view analytics' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const range = parseAnalyticsRangeKey(searchParams.get('range'))

    const memberships = await prisma.organizationMembership.findMany({
      where: { orgId: ctx.orgId },
      select: {
        userId: true,
        user: { select: { name: true, email: true, studentRole: true } },
      },
    })
    const memberIds = memberships.map((m) => m.userId)

    if (memberIds.length === 0) {
      return NextResponse.json({
        org: { id: ctx.org.id, name: ctx.org.name },
        memberCount: 0,
        range,
        analytics: null,
        memberBreakdown: [],
      })
    }

    // Cap at 50 members for response time
    const cap = memberIds.slice(0, 50)
    const perMemberResults = await Promise.all(
      cap.map(async (userId) => {
        try {
          const result = await buildDeepPerformanceAnalytics(prisma, userId, range)
          return { userId, payload: result.payload }
        } catch {
          return { userId, payload: null }
        }
      })
    )

    const valid = perMemberResults.filter((r) => r.payload !== null)

    const totalQuestioned = valid.reduce(
      (sum, r) => sum + (r.payload?.topStats?.totalQuestionsPracticed ?? (r.payload as any)?.overview?.totalQuestioned ?? 0),
      0
    )
    const avgAccuracy =
      valid.length > 0
        ? valid.reduce((sum, r) => sum + (r.payload?.topStats?.overallAccuracy ?? (r.payload as any)?.overview?.overallAccuracy ?? 0), 0) /
          valid.length
        : 0

    const subjectMap = new Map<string, { name: string; attempted: number; correct: number }>()
    for (const { payload } of valid) {
      if (!payload?.subjects) continue
      for (const subj of payload.subjects) {
        const attempted = (subj as any).attempted ?? (subj as any).questionsAttempted ?? 0
        const correct = (subj as any).correct ?? Math.round(attempted * ((subj.accuracy ?? 0) / 100))
        const existing = subjectMap.get(subj.code)
        if (existing) {
          existing.attempted += attempted
          existing.correct += correct
        } else {
          subjectMap.set(subj.code, {
            name: subj.name,
            attempted,
            correct,
          })
        }
      }
    }

    const subjectAggregates = Array.from(subjectMap.entries()).map(([code, v]) => ({
      code,
      name: v.name,
      questionsAttempted: v.attempted,
      accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 100) : 0,
    }))

    const memberBreakdown = perMemberResults.map((r) => {
      const info = memberships.find((m) => m.userId === r.userId)
      const topStats = r.payload?.topStats
      const overview = (r.payload as any)?.overview
      return {
        userId: r.userId,
        name: info?.user.name,
        email: info?.user.email,
        studentRole: info?.user.studentRole,
        totalQuestioned: topStats?.totalQuestionsPracticed ?? overview?.totalQuestioned ?? 0,
        accuracy: topStats?.overallAccuracy ?? overview?.overallAccuracy ?? 0,
        currentStreak: topStats?.streak?.current ?? overview?.currentStreak ?? 0,
      }
    })

    return NextResponse.json({
      org: { id: ctx.org.id, name: ctx.org.name },
      memberCount: memberIds.length,
      analyzedCount: cap.length,
      range,
      analytics: {
        totalQuestioned,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        subjects: subjectAggregates.sort((a, b) => a.code.localeCompare(b.code)),
      },
      memberBreakdown,
    })
  } catch (err) {
    console.error('[org/analytics] GET error:', err)
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 })
  }
}
