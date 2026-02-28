export const BETA_FEATURE_KEYS = ['faq', 'studentFeedback'] as const

export type BetaFeatureKey = (typeof BETA_FEATURE_KEYS)[number]
export type BetaFeatureVisibility = 'public' | 'beta_ambassador'
export type BetaFeatureSettings = Record<BetaFeatureKey, BetaFeatureVisibility>

export const DEFAULT_BETA_FEATURE_SETTINGS: BetaFeatureSettings = {
  faq: 'beta_ambassador',
  studentFeedback: 'beta_ambassador',
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

  return {
    faq: normalizeBetaFeatureVisibility(source.faq ?? faqFallback ?? DEFAULT_BETA_FEATURE_SETTINGS.faq),
    studentFeedback: normalizeBetaFeatureVisibility(
      source.studentFeedback ??
        studentFeedbackFallback ??
        DEFAULT_BETA_FEATURE_SETTINGS.studentFeedback
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
