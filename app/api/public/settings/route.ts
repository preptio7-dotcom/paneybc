export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
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
    return NextResponse.json({
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
      },
    })
  }
}

