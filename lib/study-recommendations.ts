import type { PrismaClient } from '@prisma/client'
import type {
  AnalyticsRangeKey,
  RecommendationChapterSnapshot,
  RecommendationContext,
} from '@/lib/deep-analytics'

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'

export type StudyRecommendationType =
  | 'weak_chapter'
  | 'overdue_subject'
  | 'new_subject'
  | 'declining_accuracy'
  | 'streak_risk'
  | 'exam_approaching'
  | 'build_strength'
  | 'bae_mock'
  | 'general'

export type StudyRecommendation = {
  priority: RecommendationPriority
  icon: string
  type: StudyRecommendationType
  title: string
  description: string
  action: string
  actionLink: string
  subject?: string
  dataPoint: string
}

const CACHE_TTL_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function icon(codepoint: number) {
  return String.fromCodePoint(codepoint)
}

function findWeakestChapter(chapters: RecommendationChapterSnapshot[]) {
  return (
    chapters
      .filter((chapter) => chapter.questionsAttempted >= 5 && chapter.accuracy < 50)
      .sort((a, b) => a.accuracy - b.accuracy)[0] || null
  )
}

function getDaysUntil(dateIso: string, now: Date) {
  const target = new Date(dateIso)
  return Math.floor((target.getTime() - now.getTime()) / DAY_MS)
}

export function generateStudyRecommendations(
  context: RecommendationContext
): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = []
  const now = new Date()

  const weakest = findWeakestChapter(context.chapters)
  if (weakest) {
    const chapterParam = weakest.id.includes(':') ? weakest.id.split(':').slice(1).join(':') : weakest.name
    recommendations.push({
      priority: 'critical',
      icon: icon(0x1f534),
      type: 'weak_chapter',
      title: `Focus on ${weakest.name}`,
      description: `Your accuracy in ${weakest.name} is only ${Math.round(
        weakest.accuracy
      )}% - this needs urgent attention before your exam.`,
      action: 'Practice Now ->',
      actionLink: `/subjects/${encodeURIComponent(weakest.subjectCode)}/practice?chapter=${encodeURIComponent(
        chapterParam
      )}`,
      subject: weakest.subjectName,
      dataPoint: `${Math.round(weakest.accuracy)}% accuracy`,
    })
  }

  const overdue = context.subjects
    .filter((subject) => subject.questionsAttempted > 0 && (subject.daysSinceLastPractice ?? 0) >= 7)
    .sort((a, b) => (b.daysSinceLastPractice || 0) - (a.daysSinceLastPractice || 0))[0]
  if (overdue) {
    const days = overdue.daysSinceLastPractice || 0
    recommendations.push({
      priority: 'high',
      icon: icon(0x23f0),
      type: 'overdue_subject',
      title: `Return to ${overdue.shortName}`,
      description: `You have not practiced ${overdue.name} in ${days} days. Regular practice prevents forgetting previously learned material.`,
      action: 'Resume Practice ->',
      actionLink: `/subjects/${encodeURIComponent(overdue.code)}`,
      dataPoint: `${days} days since last practice`,
    })
  }

  const notStarted = context.subjects.find(
    (subject) => subject.questionsAttempted === 0 && subject.totalQuestions > 0
  )
  if (notStarted) {
    recommendations.push({
      priority: 'high',
      icon: icon(0x1f195),
      type: 'new_subject',
      title: `Start ${notStarted.shortName}`,
      description: `You have not attempted any ${notStarted.name} questions yet. Comprehensive coverage across all subjects is essential for exam success.`,
      action: 'Start Now ->',
      actionLink: `/subjects/${encodeURIComponent(notStarted.code)}`,
      dataPoint: `${notStarted.totalQuestions} questions available`,
    })
  }

  for (const subject of context.subjects) {
    if (subject.recentSessions.length < 3) continue
    const recent = subject.recentSessions.slice(-3)
    const isDeclining = recent[2] < recent[1] && recent[1] < recent[0] && recent[0] - recent[2] > 10
    if (!isDeclining) continue

    recommendations.push({
      priority: 'high',
      icon: icon(0x1f4c9),
      type: 'declining_accuracy',
      title: `${subject.shortName} accuracy dropping`,
      description: `Your accuracy in ${subject.name} fell from ${recent[0]}% to ${recent[2]}% over the last 3 sessions. Consider reviewing fundamentals before the next attempt.`,
      action: 'Review Wrong Answers ->',
      actionLink: '/wrong-answers',
      dataPoint: `-${recent[0] - recent[2]}% in last 3 sessions`,
    })
    break
  }

  if (context.daysSinceLastPractice === 1) {
    recommendations.push({
      priority: 'medium',
      icon: icon(0x1f525),
      type: 'streak_risk',
      title: 'Keep your streak alive',
      description: `You have not practiced today. Your ${context.currentStreak} day streak resets at midnight if you do not practice now.`,
      action: 'Quick Practice ->',
      actionLink: '/subjects',
      dataPoint: `${context.currentStreak} day streak at risk`,
    })
  }

  if (context.examDate) {
    const daysUntilExam = getDaysUntil(context.examDate, now)
    if (daysUntilExam > 0 && daysUntilExam <= 14 && context.examReadinessScore < 70) {
      recommendations.push({
        priority: 'critical',
        icon: icon(0x26a1),
        type: 'exam_approaching',
        title: `Exam in ${daysUntilExam} days - intensify practice`,
        description: `Your exam is near and readiness is ${context.examReadinessScore}%. We recommend practicing at least 50 questions daily until your exam.`,
        action: 'Start Intensive ->',
        actionLink: '/weak-area',
        dataPoint: `${daysUntilExam} days left`,
      })
    }
  }

  const strongLowVolume = context.subjects
    .filter((subject) => subject.accuracy > 75 && subject.questionsAttempted < 50)
    .sort((a, b) => b.accuracy - a.accuracy)[0]
  if (strongLowVolume && recommendations.length < 3) {
    recommendations.push({
      priority: 'low',
      icon: icon(0x1f4aa),
      type: 'build_strength',
      title: `Build on your ${strongLowVolume.shortName} strength`,
      description: `You are at ${Math.round(strongLowVolume.accuracy)}% accuracy in ${
        strongLowVolume.name
      } but only ${strongLowVolume.questionsAttempted} attempts so far. Keep building this foundation.`,
      action: 'Continue ->',
      actionLink: `/subjects/${encodeURIComponent(strongLowVolume.code)}`,
      dataPoint: `${Math.round(strongLowVolume.accuracy)}% accuracy`,
    })
  }

  const baeivi = context.subjects.find((subject) => subject.code === 'BAEIVI')
  const baeiv2e = context.subjects.find((subject) => subject.code === 'BAEIV2E')
  if (
    baeivi &&
    baeiv2e &&
    baeivi.questionsAttempted > 20 &&
    baeiv2e.questionsAttempted > 20 &&
    context.baeMockAttempts === 0 &&
    recommendations.length < 4
  ) {
    recommendations.push({
      priority: 'medium',
      icon: icon(0x1f4dd),
      type: 'bae_mock',
      title: 'Try a BAE Mock Test',
      description:
        'You have practiced BAEIVI and BAEIV2E individually. Simulate the real ICAP format with a combined BAE mock.',
      action: 'Start BAE Mock ->',
      actionLink: '/practice/bae-mock',
      dataPoint: 'Simulate real ICAP format',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      icon: icon(0x1f31f),
      type: 'general',
      title: 'Keep up the momentum',
      description:
        'Your performance looks balanced across subjects. Continue consistent practice to maintain and improve exam readiness.',
      action: 'Continue Practicing ->',
      actionLink: '/subjects',
      dataPoint: `${context.examReadinessScore}% exam ready`,
    })
  }

  const priorityOrder: Record<RecommendationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

export async function getCachedRecommendations(
  prisma: PrismaClient,
  userId: string,
  rangeKey: AnalyticsRangeKey
): Promise<StudyRecommendation[] | null> {
  const row = await prisma.userRecommendationCache.findUnique({
    where: {
      userId_rangeKey: {
        userId,
        rangeKey,
      },
    },
  })
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    return null
  }
  return Array.isArray(row.recommendations)
    ? (row.recommendations as unknown as StudyRecommendation[])
    : null
}

export async function setCachedRecommendations(
  prisma: PrismaClient,
  userId: string,
  rangeKey: AnalyticsRangeKey,
  recommendations: StudyRecommendation[]
) {
  const generatedAt = new Date()
  const expiresAt = new Date(generatedAt.getTime() + CACHE_TTL_MS)
  await prisma.userRecommendationCache.upsert({
    where: {
      userId_rangeKey: {
        userId,
        rangeKey,
      },
    },
    create: {
      userId,
      rangeKey,
      recommendations,
      generatedAt,
      expiresAt,
    },
    update: {
      recommendations,
      generatedAt,
      expiresAt,
    },
  })
}

export async function invalidateUserRecommendationCache(
  prisma: PrismaClient,
  userId: string
) {
  await prisma.userRecommendationCache.deleteMany({
    where: { userId },
  })
}
