import type { PrismaClient } from '@prisma/client'
import { parseAnalyticsRangeKey, type AnalyticsRangeKey } from '@/lib/deep-analytics'

const DAY_MS = 24 * 60 * 60 * 1000

function rangeFrom(range: AnalyticsRangeKey) {
  if (range === 'all') return null
  const span = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return new Date(Date.now() - span * DAY_MS)
}

/** Later of two dates; null means "no lower bound". */
function laterOf(a: Date | null, b: Date): Date {
  return a && a > b ? a : b
}

/**
 * Only members who have consented are visible. Each member's results are
 * counted from their join date (joinedAt) onward, never earlier.
 */
function visibleResultsWhere(
  members: { userId: string; joinedAt: Date }[],
  from: Date | null
) {
  return {
    OR: members.map((m) => ({
      userId: m.userId,
      createdAt: { gte: laterOf(from, m.joinedAt) },
    })),
  }
}

export async function buildOrgAnalyticsSummary(prisma: PrismaClient, orgId: string, rangeInput: string | null) {
  const range = parseAnalyticsRangeKey(rangeInput)
  const from = rangeFrom(range)

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  })
  if (!org) return null

  const allMembers = await prisma.organizationMembership.findMany({
    where: { orgId },
    select: {
      userId: true,
      joinedAt: true,
      consentedAt: true,
      user: {
        select: { name: true, email: true, studentRole: true, practiceStreakCurrent: true },
      },
    },
  })

  const visible = allMembers.filter((m) => m.consentedAt !== null)

  if (visible.length === 0) {
    return {
      org,
      memberCount: allMembers.length,
      analyzedCount: 0,
      range,
      analytics: null,
      memberBreakdown: [],
    }
  }

  const grouped = await prisma.testResult.groupBy({
    by: ['userId', 'subject'],
    where: visibleResultsWhere(visible, from),
    _sum: { totalQuestions: true, correctAnswers: true },
  })

  const subjects = await prisma.subject.findMany({ select: { code: true, name: true } })
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

  const memberBreakdown = visible.map((m) => {
    const stats = memberMap.get(m.userId)
    const attempted = stats?.attempted ?? 0
    const correct = stats?.correct ?? 0
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      studentRole: m.user.studentRole,
      visibleFrom: m.joinedAt,
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
    memberCount: allMembers.length,
    analyzedCount: visible.length,
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

/**
 * Per-student view for institutes. Deliberately narrower than the student's
 * own analytics: subject totals from the join date onward, with no platform
 * comparisons or rankings against other students.
 */
export async function buildInstituteStudentAnalytics(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
  rangeInput: string | null
) {
  const membership = await prisma.organizationMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: {
      joinedAt: true,
      consentedAt: true,
      user: { select: { id: true, name: true, email: true, studentRole: true } },
    },
  })
  if (!membership) return { error: 'NOT_MEMBER' as const }
  if (!membership.consentedAt) return { error: 'NO_CONSENT' as const }

  const range = parseAnalyticsRangeKey(rangeInput)
  const since = laterOf(rangeFrom(range), membership.joinedAt)

  const grouped = await prisma.testResult.groupBy({
    by: ['subject'],
    where: { userId, createdAt: { gte: since } },
    _sum: { totalQuestions: true, correctAnswers: true },
  })

  const subjects = await prisma.subject.findMany({ select: { code: true, name: true } })
  const subjectName = new Map(subjects.map((s) => [s.code, s.name]))

  let totalQuestioned = 0
  let totalCorrect = 0
  const subjectRows = grouped
    .map((row) => {
      const attempted = row._sum.totalQuestions ?? 0
      const correct = row._sum.correctAnswers ?? 0
      totalQuestioned += attempted
      totalCorrect += correct
      return {
        code: row.subject,
        name: subjectName.get(row.subject) || row.subject,
        questionsAttempted: attempted,
        accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))

  return {
    student: membership.user,
    visibleFrom: membership.joinedAt,
    range,
    analytics: {
      totalQuestioned,
      accuracy: totalQuestioned > 0 ? Math.round((totalCorrect / totalQuestioned) * 100) : 0,
      subjects: subjectRows,
    },
  }
}
