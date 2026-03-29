export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { invalidateCache } from '@/lib/cache'
import {
  DEFAULT_DEGREES,
  DEFAULT_LEVELS,
  DEFAULT_REGISTRATION_INSTITUTES,
  parseOptionList,
} from '@/lib/account-utils'
import { extractFaqSettings } from '@/lib/faq-utils'
import { extractBetaFeatureSettings } from '@/lib/beta-features'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { hasPermission } from '@/lib/admin-permissions'
import {
  extractHomepageHeroMotionSettings,
  extractHomepageThemeSettings,
} from '@/lib/homepage-theme'
import {
  extractStreakResetTimezone,
  invalidateStreakSettingsCache,
} from '@/lib/streak-settings'

async function getAuthorizedUser(request: NextRequest) {
  const hasSuperAdminSession = request.headers.get('cookie')?.includes('super_admin_session')
  const decoded = getCurrentUser(request)
  
  if (hasSuperAdminSession) {
    return { id: 'super-admin', role: 'super_admin', adminPermissions: { canManageAds: true } }
  }

  if (decoded && (decoded.role === 'admin' || decoded.role === 'super_admin')) {
    // Fetch fresh user from DB to check current permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, adminPermissions: true }
    })
    return user
  }
  
  return null
}

export async function GET(request: NextRequest) {
  // Admin-only, low traffic — no caching needed, always serve live data
  try {
    const admin = await getAuthorizedUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(admin.role, admin.adminPermissions, 'canManageAds')) {
      return NextResponse.json({ error: 'Forbidden: No Ads access' }, { status: 403 })
    }

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
      registrationInstitutes: DEFAULT_REGISTRATION_INSTITUTES,
      betaFeatures: extractBetaFeatureSettings(savedTestSettings),
      faq: extractFaqSettings(savedTestSettings),
      homepageThemes: extractHomepageThemeSettings(savedTestSettings),
      homepageHeroMotion: extractHomepageHeroMotionSettings(savedTestSettings),
      streakResetTimezone: extractStreakResetTimezone(savedTestSettings),
      ...savedTestSettings,
    }
    const normalizedBetaFeatures = extractBetaFeatureSettings(testSettings)
    const normalizedFaq = extractFaqSettings(testSettings)
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
      registrationInstitutes: (() => {
        const next = parseOptionList(
          testSettings.registrationInstitutes,
          DEFAULT_REGISTRATION_INSTITUTES,
          140
        )
        return next.length ? next : DEFAULT_REGISTRATION_INSTITUTES
      })(),
      betaFeatures: normalizedBetaFeatures,
      homepageThemes: extractHomepageThemeSettings(testSettings),
      homepageHeroMotion: extractHomepageHeroMotionSettings(testSettings),
      streakResetTimezone: extractStreakResetTimezone(testSettings),
      faq: { ...normalizedFaq, visibility: normalizedBetaFeatures.faq },
      studentFeedback: { visibility: normalizedBetaFeatures.studentFeedback },
      blog: { visibility: normalizedBetaFeatures.blog },
      performanceAnalytics: { visibility: normalizedBetaFeatures.performanceAnalytics },
      aiRecommendations: { visibility: normalizedBetaFeatures.aiRecommendations },
      homepageFeatureShowcase: { visibility: normalizedBetaFeatures.homepageFeatureShowcase },
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

    return NextResponse.json({
      adsEnabled: settings.adsEnabled ?? false,
      welcomeMessageTemplate: settings.welcomeMessageTemplate || 'Welcome back, {{name}}!',
      activeAvatarPackId: settings.activeAvatarPackId || null,
      adContent,
      adSenseConfig,
      testSettings: normalizedTestSettings,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthorizedUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(admin.role, admin.adminPermissions, 'canManageAds')) {
      return NextResponse.json({ error: 'Forbidden: No Ads access' }, { status: 403 })
    }

    const payload = await request.json()
    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: {} })
    }

    const savedAdContent =
      settings.adContent && typeof settings.adContent === 'object' && !Array.isArray(settings.adContent)
        ? (settings.adContent as Record<string, any>)
        : {}
    const savedTestSettings =
      settings.testSettings && typeof settings.testSettings === 'object' && !Array.isArray(settings.testSettings)
        ? (settings.testSettings as Record<string, any>)
        : {}

    const currentAdContent = Object.keys(savedAdContent).length ? savedAdContent : {
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

    const currentTestSettings = {
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

    const beforeSnapshot = {
      adsEnabled: settings.adsEnabled ?? false,
      welcomeMessageTemplate: settings.welcomeMessageTemplate || 'Welcome back, {{name}}!',
      activeAvatarPackId: settings.activeAvatarPackId || null,
      adContent: currentAdContent,
      adSenseConfig,
      testSettings: currentTestSettings,
    }

    const updatedAdSenseConfig = payload.adSenseConfig
      ? { ...adSenseConfig, ...payload.adSenseConfig }
      : adSenseConfig

    const updatedAdContent = {
      ...currentAdContent,
      dashboard: payload.adContent?.dashboard
        ? { ...currentAdContent.dashboard, ...payload.adContent.dashboard }
        : currentAdContent.dashboard,
      results: payload.adContent?.results
        ? { ...currentAdContent.results, ...payload.adContent.results }
        : currentAdContent.results,
    }

    const mergedTestSettings = payload.testSettings
      ? { ...currentTestSettings, ...payload.testSettings }
      : currentTestSettings
    const mergedBetaFeatures = extractBetaFeatureSettings(mergedTestSettings)

    const updatedTestSettings = {
      ...mergedTestSettings,
      registrationDegrees: (() => {
        const next = parseOptionList(mergedTestSettings.registrationDegrees, DEFAULT_DEGREES)
        return next.length ? next : DEFAULT_DEGREES
      })(),
      registrationLevels: (() => {
        const next = parseOptionList(mergedTestSettings.registrationLevels, DEFAULT_LEVELS)
        return next.length ? next : DEFAULT_LEVELS
      })(),
      registrationInstitutes: (() => {
        const next = parseOptionList(
          mergedTestSettings.registrationInstitutes,
          DEFAULT_REGISTRATION_INSTITUTES,
          140
        )
        return next.length ? next : DEFAULT_REGISTRATION_INSTITUTES
      })(),
      betaFeatures: mergedBetaFeatures,
      homepageThemes: extractHomepageThemeSettings(mergedTestSettings),
      homepageHeroMotion: extractHomepageHeroMotionSettings(mergedTestSettings),
      streakResetTimezone: extractStreakResetTimezone(mergedTestSettings),
      faq: { ...extractFaqSettings(mergedTestSettings), visibility: mergedBetaFeatures.faq },
      studentFeedback: { visibility: mergedBetaFeatures.studentFeedback },
      blog: { visibility: mergedBetaFeatures.blog },
      performanceAnalytics: { visibility: mergedBetaFeatures.performanceAnalytics },
      aiRecommendations: { visibility: mergedBetaFeatures.aiRecommendations },
      homepageFeatureShowcase: { visibility: mergedBetaFeatures.homepageFeatureShowcase },
    }

    settings = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        ...(typeof payload.adsEnabled === 'boolean' ? { adsEnabled: payload.adsEnabled } : {}),
        ...(typeof payload.welcomeMessageTemplate === 'string'
          ? { welcomeMessageTemplate: payload.welcomeMessageTemplate } : {}),
        ...(typeof payload.activeAvatarPackId === 'string' || payload.activeAvatarPackId === null
          ? { activeAvatarPackId: payload.activeAvatarPackId || null } : {}),
        adContent: updatedAdContent,
        adSenseConfig: updatedAdSenseConfig,
        testSettings: updatedTestSettings,
      },
    })

    invalidateStreakSettingsCache()

    // ── Cache invalidation ────────────────────────────────────────────────────
    // Settings just changed — clear public settings cache immediately
    // so all users get fresh settings on their next request
    invalidateCache('public:settings:')

    if (admin && (admin.role === 'admin' || admin.role === 'super_admin')) {
      await createAdminAuditLog({
        request,
        actor: admin,
        action: 'SYSTEM_SETTINGS_UPDATED',
        targetType: 'system_settings',
        targetId: settings.id,
        before: beforeSnapshot,
        after: {
          adsEnabled: settings.adsEnabled,
          welcomeMessageTemplate: settings.welcomeMessageTemplate,
          activeAvatarPackId: settings.activeAvatarPackId || null,
          adContent: settings.adContent,
          testSettings: settings.testSettings,
        },
        metadata: {
          changedKeys: Object.keys(payload || {}),
          changedTestSettingsKeys: Object.keys(payload?.testSettings || {}),
          changedBetaFeaturesKeys: Object.keys(payload?.testSettings?.betaFeatures || {}),
        },
      })
    }

    return NextResponse.json({
      success: true,
      adsEnabled: settings.adsEnabled,
      welcomeMessageTemplate: settings.welcomeMessageTemplate,
      activeAvatarPackId: settings.activeAvatarPackId || null,
      adContent: settings.adContent,
      testSettings: settings.testSettings,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}