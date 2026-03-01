export type HomepageThemeVariant = 'light' | 'gray' | 'dark'

export type HomepageSectionThemeSettings = {
  hero: HomepageThemeVariant
  whyChoose: HomepageThemeVariant
  howItWorks: HomepageThemeVariant
  stats: HomepageThemeVariant
  cta: HomepageThemeVariant
  feedback: HomepageThemeVariant
  faq: HomepageThemeVariant
}

export type HomepageHeroMotionSettings = {
  floatDurationSeconds: number
  floatDistanceDesktopPx: number
  floatDistanceMobilePx: number
  badgeFloatDurationSeconds: number
  badgeFloatDistancePx: number
}

type AnyRecord = Record<string, unknown>

export const DEFAULT_HOMEPAGE_THEME_SETTINGS: HomepageSectionThemeSettings = {
  hero: 'light',
  whyChoose: 'light',
  howItWorks: 'gray',
  stats: 'dark',
  cta: 'dark',
  feedback: 'gray',
  faq: 'light',
}

export const DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS: HomepageHeroMotionSettings = {
  floatDurationSeconds: 4,
  floatDistanceDesktopPx: 14,
  floatDistanceMobilePx: 8,
  badgeFloatDurationSeconds: 3,
  badgeFloatDistancePx: 8,
}

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as AnyRecord
}

function normalizeVariant(value: unknown, fallback: HomepageThemeVariant): HomepageThemeVariant {
  if (value === 'light' || value === 'gray' || value === 'dark') return value
  return fallback
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

export function extractHomepageThemeSettings(
  source: unknown
): HomepageSectionThemeSettings {
  const root = asRecord(source)
  const settings = asRecord(root.homepageThemes)

  return {
    hero: normalizeVariant(settings.hero, DEFAULT_HOMEPAGE_THEME_SETTINGS.hero),
    whyChoose: normalizeVariant(settings.whyChoose, DEFAULT_HOMEPAGE_THEME_SETTINGS.whyChoose),
    howItWorks: normalizeVariant(settings.howItWorks, DEFAULT_HOMEPAGE_THEME_SETTINGS.howItWorks),
    stats: normalizeVariant(settings.stats, DEFAULT_HOMEPAGE_THEME_SETTINGS.stats),
    cta: normalizeVariant(settings.cta, DEFAULT_HOMEPAGE_THEME_SETTINGS.cta),
    feedback: normalizeVariant(settings.feedback, DEFAULT_HOMEPAGE_THEME_SETTINGS.feedback),
    faq: normalizeVariant(settings.faq, DEFAULT_HOMEPAGE_THEME_SETTINGS.faq),
  }
}

export function extractHomepageHeroMotionSettings(
  source: unknown
): HomepageHeroMotionSettings {
  const root = asRecord(source)
  const settings = asRecord(root.homepageHeroMotion)

  return {
    floatDurationSeconds: normalizeNumber(
      settings.floatDurationSeconds,
      DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.floatDurationSeconds,
      2,
      10
    ),
    floatDistanceDesktopPx: normalizeNumber(
      settings.floatDistanceDesktopPx,
      DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.floatDistanceDesktopPx,
      4,
      30
    ),
    floatDistanceMobilePx: normalizeNumber(
      settings.floatDistanceMobilePx,
      DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.floatDistanceMobilePx,
      2,
      20
    ),
    badgeFloatDurationSeconds: normalizeNumber(
      settings.badgeFloatDurationSeconds,
      DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.badgeFloatDurationSeconds,
      2,
      8
    ),
    badgeFloatDistancePx: normalizeNumber(
      settings.badgeFloatDistancePx,
      DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.badgeFloatDistancePx,
      2,
      20
    ),
  }
}
