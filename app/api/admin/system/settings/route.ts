export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function isAuthorized(request: NextRequest) {
  const hasSuperAdminSession = request.headers.get('cookie')?.includes('super_admin_session')
  if (hasSuperAdminSession) return true
  // Fallback to token-based admin access
  try {
    const decoded = getCurrentUser(request)
    return Boolean(decoded && (decoded.role === 'admin' || decoded.role === 'super_admin'))
  } catch (error) {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { adsEnabled: false } })
    }

    const adContent = settings.adContent || {
      dashboard: {
        headline: 'Level up your CA prep with expert-led notes',
        body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
        cta: 'Explore resources',
        href: '#',
      },
      results: {
        headline: 'Boost your score with targeted mock reviews',
        body: 'Short, focused revision plans built for CA students—improve accuracy before your next exam.',
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
      ...(settings.testSettings || {}),
    }

    return NextResponse.json({
      adsEnabled: settings.adsEnabled ?? false,
      welcomeMessageTemplate: settings.welcomeMessageTemplate || 'Welcome back, {{name}}!',
      adContent,
      testSettings,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: {} })
    }

    const currentAdContent = settings.adContent || {
      dashboard: {
        headline: 'Level up your CA prep with expert-led notes',
        body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
        cta: 'Explore resources',
        href: '#',
      },
      results: {
        headline: 'Boost your score with targeted mock reviews',
        body: 'Short, focused revision plans built for CA studentsâ€”improve accuracy before your next exam.',
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
      ...(settings.testSettings || {}),
    }

    const updatedAdContent = {
      ...currentAdContent,
      dashboard: payload.adContent?.dashboard
        ? { ...currentAdContent.dashboard, ...payload.adContent.dashboard }
        : currentAdContent.dashboard,
      results: payload.adContent?.results
        ? { ...currentAdContent.results, ...payload.adContent.results }
        : currentAdContent.results,
    }

    const updatedTestSettings = payload.testSettings
      ? { ...currentTestSettings, ...payload.testSettings }
      : currentTestSettings

    settings = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        ...(typeof payload.adsEnabled === 'boolean' ? { adsEnabled: payload.adsEnabled } : {}),
        ...(typeof payload.welcomeMessageTemplate === 'string' ? { welcomeMessageTemplate: payload.welcomeMessageTemplate } : {}),
        adContent: updatedAdContent,
        testSettings: updatedTestSettings,
      },
    })

    return NextResponse.json({
      success: true,
      adsEnabled: settings.adsEnabled,
      welcomeMessageTemplate: settings.welcomeMessageTemplate,
      adContent: settings.adContent,
      testSettings: settings.testSettings,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

