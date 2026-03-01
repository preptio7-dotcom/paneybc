export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_DEGREES, DEFAULT_LEVELS, parseOptionList } from '@/lib/account-utils'
import { extractFaqSettings } from '@/lib/faq-utils'
import { getCurrentUser } from '@/lib/auth'
import { canAccessBetaFeature, extractBetaFeatureSettings } from '@/lib/beta-features'
import { extractHomepageThemeSettings } from '@/lib/homepage-theme'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    const isPersonalizedResponse = Boolean(currentUser)

    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { adsEnabled: false } })
    }

    const savedAdContent =
      settings.adContent && typeof settings.adContent === 'object' && !Array.isArray(settings.adContent)
        ? (settings.adContent as Record<string, any>)
        : {}
    const savedTestSettings =
      settings.testSettings && typeof settings.testSettings === 'object' && !Array.isArray(settings.testSettings)
        ? (settings.testSettings as Record<string, any>)
        : {}

    const adContent = Object.keys(savedAdContent).length ? savedAdContent : {
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
      betaFeatures: extractBetaFeatureSettings(savedTestSettings),
      faq: extractFaqSettings(savedTestSettings),
      homepageThemes: extractHomepageThemeSettings(savedTestSettings),
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
      betaFeatures,
      homepageThemes: extractHomepageThemeSettings(testSettings),
      faq: {
        ...faqSettings,
        visibility: betaFeatures.faq,
        items: faqItems,
        featuredIds: faqFeaturedIds,
      },
      studentFeedback: {
        visibility: betaFeatures.studentFeedback,
      },
    }

    return NextResponse.json(
      {
        adsEnabled: settings.adsEnabled ?? false,
        welcomeMessageTemplate: settings.welcomeMessageTemplate || 'Welcome back, {{name}}!',
        adContent,
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
          betaFeatures: fallbackBetaFeatures,
          homepageThemes: extractHomepageThemeSettings({}),
          faq: {
            ...extractFaqSettings({}),
            visibility: fallbackBetaFeatures.faq,
            items: [],
            featuredIds: [],
          },
          studentFeedback: {
            visibility: fallbackBetaFeatures.studentFeedback,
          },
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

