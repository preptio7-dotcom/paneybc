export const BETA_FEATURE_KEYS = [
  'faq',
  'studentFeedback',
  'blog',
  'performanceAnalytics',
  'aiRecommendations',
  'homepageFeatureShowcase',
] as const

export type BetaFeatureKey = (typeof BETA_FEATURE_KEYS)[number]
export type BetaFeatureVisibility = 'public' | 'beta_ambassador'
export type BetaFeatureSettings = Record<BetaFeatureKey, BetaFeatureVisibility>

export const DEFAULT_BETA_FEATURE_SETTINGS: BetaFeatureSettings = {
  faq: 'beta_ambassador',
  studentFeedback: 'beta_ambassador',
  blog: 'beta_ambassador',
  performanceAnalytics: 'beta_ambassador',
  aiRecommendations: 'beta_ambassador',
  homepageFeatureShowcase: 'beta_ambassador',
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function normalizeBetaFeatureVisibility(value: unknown): BetaFeatureVisibility {
  return value === 'public' ? 'public' : 'beta_ambassador'
}

export function extractBetaFeatureSettings(testSettings: unknown): BetaFeatureSettings {
  const source = asRecord(asRecord(testSettings).betaFeatures)
  const faqFallback = asRecord(asRecord(testSettings).faq).visibility
  const studentFeedbackFallback = asRecord(asRecord(testSettings).studentFeedback).visibility
  const blogFallback = asRecord(asRecord(testSettings).blog).visibility
  const performanceAnalyticsFallback =
    asRecord(asRecord(testSettings).performanceAnalytics).visibility ??
    asRecord(asRecord(testSettings).analytics).visibility
  const aiRecommendationsFallback =
    asRecord(asRecord(testSettings).aiRecommendations).visibility ??
    asRecord(asRecord(testSettings).recommendations).visibility
  const homepageFeatureShowcaseFallback =
    asRecord(asRecord(testSettings).homepageFeatureShowcase).visibility

  return {
    faq: normalizeBetaFeatureVisibility(source.faq ?? faqFallback ?? DEFAULT_BETA_FEATURE_SETTINGS.faq),
    studentFeedback: normalizeBetaFeatureVisibility(
      source.studentFeedback ??
        studentFeedbackFallback ??
        DEFAULT_BETA_FEATURE_SETTINGS.studentFeedback
    ),
    blog: normalizeBetaFeatureVisibility(source.blog ?? blogFallback ?? DEFAULT_BETA_FEATURE_SETTINGS.blog),
    performanceAnalytics: normalizeBetaFeatureVisibility(
      source.performanceAnalytics ??
        performanceAnalyticsFallback ??
        DEFAULT_BETA_FEATURE_SETTINGS.performanceAnalytics
    ),
    aiRecommendations: normalizeBetaFeatureVisibility(
      source.aiRecommendations ?? aiRecommendationsFallback ?? DEFAULT_BETA_FEATURE_SETTINGS.aiRecommendations
    ),
    homepageFeatureShowcase: normalizeBetaFeatureVisibility(
      source.homepageFeatureShowcase ??
        homepageFeatureShowcaseFallback ??
        DEFAULT_BETA_FEATURE_SETTINGS.homepageFeatureShowcase
    ),
  }
}

export function canAccessBetaFeature(
  visibility: BetaFeatureVisibility,
  studentRole?: string | null
) {
  if (visibility === 'public') return true
  return studentRole === 'ambassador'
}
