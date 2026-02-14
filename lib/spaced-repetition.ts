export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30]

export interface ReviewState {
  stageIndex: number
  correctStreak: number
  totalReviews: number
}

export interface ReviewUpdate {
  stageIndex: number
  correctStreak: number
  totalReviews: number
  nextReviewAt: Date
  lastReviewedAt: Date
}

export function buildReviewUpdate(params: {
  previous?: Partial<ReviewState>
  isCorrect: boolean
  now?: Date
}): ReviewUpdate {
  const now = params.now ?? new Date()
  const prevStage = params.previous?.stageIndex ?? -1
  const prevStreak = params.previous?.correctStreak ?? 0
  const prevReviews = params.previous?.totalReviews ?? 0

  const nextStage = params.isCorrect
    ? Math.min(prevStage + 1, REVIEW_INTERVAL_DAYS.length - 1)
    : 0

  const nextStreak = params.isCorrect ? prevStreak + 1 : 0

  const nextReviewAt = new Date(now.getTime() + REVIEW_INTERVAL_DAYS[nextStage] * 24 * 60 * 60 * 1000)

  return {
    stageIndex: nextStage,
    correctStreak: nextStreak,
    totalReviews: prevReviews + 1,
    nextReviewAt,
    lastReviewedAt: now,
  }
}
