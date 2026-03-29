export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/cache'
import {
  DEFAULT_DEGREES,
  DEFAULT_LEVELS,
  DEFAULT_REGISTRATION_INSTITUTES,
  parseOptionList,
} from '@/lib/account-utils'
import { extractFaqSettings } from '@/lib/faq-utils'
import { getCurrentUser } from '@/lib/auth'
import { canAccessBetaFeature, extractBetaFeatureSettings } from '@/lib/beta-features'
import {
  extractHomepageHeroMotionSettings,
  extractHomepageThemeSettings,
} from '@/lib/homepage-theme'
import { DEFAULT_STREAK_RESET_TIMEZONE, extractStreakResetTimezone } from '@/lib/streak-settings'
import { getInstituteKey } from '@/lib/institutes'

// ─── Cache TTLs ───────────────────────────────────────────────────────────────
const TTL_SYSTEM_SETTINGS  = 300   // 5 min  — settings rarely change
const TTL_INSTITUTE_USAGE  = 1800  // 30 min — institute usage ranking barely moves

// ─── Cache keys ───────────────────────────────────────────────────────────────
const KEY_SYSTEM_SETTINGS  = 'public:settings:system'
const KEY_INSTITUTE_USAGE  = 'public:settings:institute-usage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// FIX: was running prisma.user.groupBy() on every single settings request
// This is a heavy aggregation across the entire users table
// Now cached 30 min — institute popularity barely changes minute to minute
async function sortInstitutesByUsageCached(institutes: string[]) {
  if (!institutes.length) return institutes

  const usageMap = await withCache(
    KEY_INSTITUTE_USAGE,
    TTL_INSTITUTE_USAGE,
    async () => {
      const usageRows = await prisma.user.groupBy({
        by: ['institute'],
        where: { institute: { not: null } },
        _count: { _all: true },
      })

      const map: Record<string, number> = {}
      for (const row of usageRows) {
        if (!row.institute) continue
        const key = getInstituteKey(row.institute)
        map[key] = (map[key] || 0) + (row._count?._all || 0)
      }
      return map
    }
  )

  return [...institutes].sort((a, b) => {
    const usageA = usageMap[getInstituteKey(a)] || 0
    const usageB = usageMap[getInstituteKey(b)] || 0
    if (usageB !== usageA) return usageB - usageA
    return a.localeCompare(b)
  })
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    const isPersonalizedResponse = Boolean(currentUser)

    // FIX: was calling prisma.systemSettings.findFirst() on every request
    // Settings only change when admin updates them — cache for 5 minutes
    let settings = await withCache(
      KEY_SYSTEM_SETTINGS,
      TTL_SYSTEM_SETTINGS,
      async () => {
        let s = await prisma.systemSettings.findFirst()
        if (!s) {
          s = await prisma.systemSettings.create({ data: { adsEnabled: false } })
        }
        return s
      }
    )

    const savedAdContent =
      settings.adContent &&
      typeof settings.adContent === 'object' &&
      !Array.isArray(settings.adContent)
        ? (settings.adContent as Record<string, any>)
        : {}

    const savedTestSettings =
      settings.testSettings &&
      typeof settings.testSettings === 'object' &&
      !Array.isArray(settings.testSettings)
        ? (settings.testSettings as Record<string, any>)
        : {}

    const adContent = Object.keys(savedAdContent).length
      ? savedAdContent
      : {
          dashboard: {
            headline: 'Level up your CA prep with expert-led notes',
            body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
            cta: 'Explore resources',
            href: '#',
          },
          results: {
            headline: 'Boost your score with targeted mock reviews',
            body: 'Short, focused revision plans built for CA students - improve accuracy before your next exam.',
            cta: 'See plans',
            href: '#',
          },
        }

    const testSettings = {
      fullBookTimeMinutes: 120,
      chapterTestDefaultMinutes: 30,
      chapterTestDefaultQuestions: 25,
      demoEnabled: true,
      demoMaxQuestions: 10,
      demoTimeMinutes: 20,
      demoSubjects: [],
      registrationDegrees: DEFAULT_DEGREES,
      registrationLevels: DEFAULT_LEVELS,
      registrationInstitutes: DEFAULT_REGISTRATION_INSTITUTES,
      betaFeatures: extractBetaFeatureSettings(savedTestSettings),
      faq: extractFaqSettings(savedTestSettings),
      homepageThemes: extractHomepageThemeSettings(savedTestSettings),
      homepageHeroMotion: extractHomepageHeroMotionSettings(savedTestSettings),
      streakResetTimezone: extractStreakResetTimezone(savedTestSettings),
      ...savedTestSettings,
    }

    const betaFeatures = extractBetaFeatureSettings(testSettings)
    const faqSettings = extractFaqSettings(testSettings)
    let faqItems = faqSettings.items
    let faqFeaturedIds = faqSettings.featuredIds

    if (!canAccessBetaFeature(betaFeatures.faq, null)) {
      faqItems = []
      faqFeaturedIds = []
      if (currentUser) {
        // User-specific check — not cached (different per user role)
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          select: { studentRole: true },
        })
        if (canAccessBetaFeature(betaFeatures.faq, user?.studentRole)) {
          faqItems = faqSettings.items
          faqFeaturedIds = faqSettings.featuredIds
        }
      }
    }

    const visibleIds = new Set(faqItems.map((item) => item.id))
    faqFeaturedIds = faqFeaturedIds.filter((id) => visibleIds.has(id))

    // FIX: sortInstitutesByUsage now uses cached groupBy result
    const registrationInstitutesSorted = await sortInstitutesByUsageCached(
      (() => {
        const next = parseOptionList(
          testSettings.registrationInstitutes,
          DEFAULT_REGISTRATION_INSTITUTES,
          140
        )
        return next.length ? next : DEFAULT_REGISTRATION_INSTITUTES
      })()
    )

    const normalizedTestSettings = {
      ...testSettings,
      registrationDegrees: (() => {
        const next = parseOptionList(testSettings.registrationDegrees, DEFAULT_DEGREES)
        return next.length ? next : DEFAULT_DEGREES
      })(),
      registrationLevels: (() => {
        const next = parseOptionList(testSettings.registrationLevels, DEFAULT_LEVELS)
        return next.length ? next : DEFAULT_LEVELS
      })(),
      registrationInstitutes: registrationInstitutesSorted,
      betaFeatures,
      homepageThemes: extractHomepageThemeSettings(testSettings),
      homepageHeroMotion: extractHomepageHeroMotionSettings(testSettings),
      streakResetTimezone: extractStreakResetTimezone(testSettings),
      faq: {
        ...faqSettings,
        visibility: betaFeatures.faq,
        items: faqItems,
        featuredIds: faqFeaturedIds,
      },
      studentFeedback: { visibility: betaFeatures.studentFeedback },
      blog: { visibility: betaFeatures.blog },
      performanceAnalytics: { visibility: betaFeatures.performanceAnalytics },
      aiRecommendations: { visibility: betaFeatures.aiRecommendations },
      homepageFeatureShowcase: { visibility: betaFeatures.homepageFeatureShowcase },
    }

    const savedAdSenseConfig =
      settings.adSenseConfig && typeof settings.adSenseConfig === 'object' && !Array.isArray(settings.adSenseConfig)
        ? (settings.adSenseConfig as Record<string, any>)
        : {}

    const adSenseConfig = {
      globalEnabled: settings.adsEnabled ?? true,
      allowedPaths: ['/', '/blog', '/blog/*'],
      blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
      showAdsToUnpaid: true,
      showAdsToPaid: false,
      showAdsToAmbassador: false,
      ...savedAdSenseConfig,
    }

    return NextResponse.json(
      {
        adsEnabled: settings.adsEnabled ?? false,
        welcomeMessageTemplate: settings.welcomeMessageTemplate || 'Welcome back, {{name}}!',
        activeAvatarPackId: settings.activeAvatarPackId || null,
        adContent,
        adSenseConfig,
        testSettings: normalizedTestSettings,
      },
      {
        headers: {
          'Cache-Control': isPersonalizedResponse
            ? 'private, max-age=30, stale-while-revalidate=120'
            : 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    const fallbackBetaFeatures = extractBetaFeatureSettings({})
    return NextResponse.json(
      {
        adsEnabled: true,
        welcomeMessageTemplate: 'Welcome back, {{name}}!',
        activeAvatarPackId: null,
        testSettings: {
          fullBookTimeMinutes: 120,
          chapterTestDefaultMinutes: 30,
          chapterTestDefaultQuestions: 25,
          demoEnabled: true,
          demoMaxQuestions: 10,
          demoTimeMinutes: 20,
          demoSubjects: [],
          registrationDegrees: DEFAULT_DEGREES,
          registrationLevels: DEFAULT_LEVELS,
          registrationInstitutes: DEFAULT_REGISTRATION_INSTITUTES,
          betaFeatures: fallbackBetaFeatures,
          homepageThemes: extractHomepageThemeSettings({}),
          homepageHeroMotion: extractHomepageHeroMotionSettings({}),
          streakResetTimezone: DEFAULT_STREAK_RESET_TIMEZONE,
          faq: {
            ...extractFaqSettings({}),
            visibility: fallbackBetaFeatures.faq,
            items: [],
            featuredIds: [],
          },
          studentFeedback: { visibility: fallbackBetaFeatures.studentFeedback },
          blog: { visibility: fallbackBetaFeatures.blog },
          performanceAnalytics: { visibility: fallbackBetaFeatures.performanceAnalytics },
          aiRecommendations: { visibility: fallbackBetaFeatures.aiRecommendations },
          homepageFeatureShowcase: { visibility: fallbackBetaFeatures.homepageFeatureShowcase },
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
        },
      }
    )
  }
}