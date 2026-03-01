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

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as AnyRecord
}

function normalizeVariant(value: unknown, fallback: HomepageThemeVariant): HomepageThemeVariant {
  if (value === 'light' || value === 'gray' || value === 'dark') return value
  return fallback
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

