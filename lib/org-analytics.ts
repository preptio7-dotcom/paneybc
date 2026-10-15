import type { PrismaClient } from '@prisma/client'
import { parseAnalyticsRangeKey, type AnalyticsRangeKey } from '@/lib/deep-analytics'

const DAY_MS = 24 * 60 * 60 * 1000

function rangeFrom(range: AnalyticsRangeKey) {
  if (range === 'all') return null
  const span = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return new Date(Date.now() - span * DAY_MS)
}

export async function buildOrgAnalyticsSummary(prisma: PrismaClient, orgId: string, rangeInput: string | null) {
  const range = parseAnalyticsRangeKey(rangeInput)
  const from = rangeFrom(range)

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  })
  if (!org) return null

  const memberships = await prisma.organizationMembership.findMany({
    where: { orgId },
    select: {
      userId: true,
      user: {
        select: {
          name: true,
          email: true,
          studentRole: true,
          practiceStreakCurrent: true,
        },
      },
    },
  })
  const memberIds = memberships.map((m) => m.userId)

  if (memberIds.length === 0) {
    return {
      org,
      memberCount: 0,
      analyzedCount: 0,
      range,
      analytics: null,
      memberBreakdown: [],
    }
  }

  const where = from
    ? { userId: { in: memberIds }, createdAt: { gte: from } }
    : { userId: { in: memberIds } }

  const grouped = await prisma.testResult.groupBy({
    by: ['userId', 'subject'],
    where,
    _sum: {
      totalQuestions: true,
      correctAnswers: true,
    },
  })

  const subjects = await prisma.subject.findMany({
    select: { code: true, name: true },
  })
  const subjectName = new Map(subjects.map((s) => [s.code, s.name]))

  const subjectMap = new Map<string, { name: string; attempted: number; correct: number }>()
  const memberMap = new Map<string, { attempted: number; correct: number }>()

  for (const row of grouped) {
    if (!row.userId) continue
    const attempted = row._sum.totalQuestions ?? 0
    const correct = row._sum.correctAnswers ?? 0

    const member = memberMap.get(row.userId) || { attempted: 0, correct: 0 }
    member.attempted += attempted
    member.correct += correct
    memberMap.set(row.userId, member)

    const existing = subjectMap.get(row.subject) || {
      name: subjectName.get(row.subject) || row.subject,
      attempted: 0,
      correct: 0,
    }
    existing.attempted += attempted
    existing.correct += correct
    subjectMap.set(row.subject, existing)
  }

  const memberBreakdown = memberships.map((m) => {
    const stats = memberMap.get(m.userId)
    const attempted = stats?.attempted ?? 0
    const correct = stats?.correct ?? 0
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      studentRole: m.user.studentRole,
      totalQuestioned: attempted,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0,
      currentStreak: m.user.practiceStreakCurrent ?? 0,
    }
  })

  const totalQuestioned = memberBreakdown.reduce((sum, m) => sum + m.totalQuestioned, 0)
  const membersWithAttempts = memberBreakdown.filter((m) => m.totalQuestioned > 0)
  const avgAccuracy =
    membersWithAttempts.length > 0
      ? membersWithAttempts.reduce((sum, m) => sum + m.accuracy, 0) / membersWithAttempts.length
      : 0

  return {
    org,
    memberCount: memberIds.length,
    analyzedCount: memberIds.length,
    range,
    analytics: {
      totalQuestioned,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      subjects: Array.from(subjectMap.entries())
        .map(([code, v]) => ({
          code,
          name: v.name,
          questionsAttempted: v.attempted,
          accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 100) : 0,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    },
    memberBreakdown,
  }
}
