export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildDeepPerformanceAnalytics, parseAnalyticsRangeKey } from '@/lib/deep-analytics'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/organizations/[id]/analytics
 *
 * Returns aggregated analytics for all members of an org.
 * Reuses the existing buildDeepPerformanceAnalytics engine — no duplication.
 * Run in parallel per member (capped at 50) then merge.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = requireAdminUser(request)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const range = parseAnalyticsRangeKey(searchParams.get('range'))

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true },
    })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const memberships = await prisma.organizationMembership.findMany({
      where: { orgId: id },
      select: {
        userId: true,
        user: { select: { name: true, email: true, studentRole: true } },
      },
    })
    const memberIds = memberships.map((m) => m.userId)

    if (memberIds.length === 0) {
      return NextResponse.json({
        org: { id: org.id, name: org.name },
        memberCount: 0,
        range,
        analytics: null,
        memberBreakdown: [],
      })
    }

    // Run per member (cap at 50 to stay within response time budget)
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

    // Aggregate totals
    const totalQuestioned = valid.reduce(
      (sum, r) => sum + (r.payload?.overview?.totalQuestioned ?? 0),
      0
    )
    const avgAccuracy =
      valid.length > 0
        ? valid.reduce((sum, r) => sum + (r.payload?.overview?.overallAccuracy ?? 0), 0) /
          valid.length
        : 0

    // Aggregate subject performance
    const subjectMap = new Map<string, { name: string; attempted: number; correct: number }>()
    for (const { payload } of valid) {
      if (!payload?.subjects) continue
      for (const subj of payload.subjects) {
        const existing = subjectMap.get(subj.code)
        if (existing) {
          const correct = Math.round(subj.questionsAttempted * (subj.accuracy / 100))
          existing.attempted += subj.questionsAttempted
          existing.correct += correct
        } else {
          subjectMap.set(subj.code, {
            name: subj.name,
            attempted: subj.questionsAttempted,
            correct: Math.round(subj.questionsAttempted * (subj.accuracy / 100)),
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

    // Per-member lightweight breakdown
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
      org: { id: org.id, name: org.name },
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
    console.error('[admin/organizations/[id]/analytics] GET error:', err)
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 })
  }
}
