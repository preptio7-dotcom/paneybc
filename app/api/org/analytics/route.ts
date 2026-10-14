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
      (sum, r) => sum + (r.payload?.overview?.totalQuestioned ?? 0),
      0
    )
    const avgAccuracy =
      valid.length > 0
        ? valid.reduce((sum, r) => sum + (r.payload?.overview?.overallAccuracy ?? 0), 0) /
          valid.length
        : 0

    const subjectMap = new Map<string, { name: string; attempted: number; correct: number }>()
    for (const { payload } of valid) {
      if (!payload?.subjects) continue
      for (const subj of payload.subjects) {
        const existing = subjectMap.get(subj.code)
        const correct = Math.round(subj.questionsAttempted * (subj.accuracy / 100))
        if (existing) {
          existing.attempted += subj.questionsAttempted
          existing.correct += correct
        } else {
          subjectMap.set(subj.code, {
            name: subj.name,
            attempted: subj.questionsAttempted,
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
      return {
        userId: r.userId,
        name: info?.user.name,
        email: info?.user.email,
        studentRole: info?.user.studentRole,
        totalQuestioned: r.payload?.overview?.totalQuestioned ?? 0,
        accuracy: r.payload?.overview?.overallAccuracy ?? 0,
        currentStreak: r.payload?.overview?.currentStreak ?? 0,
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
