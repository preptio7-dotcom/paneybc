export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  getInstituteKey,
  getRegistrationInstitutesState,
  normalizeInstituteName,
} from '@/lib/institutes'

async function requireAdmin(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return null
  }
  return currentUser
}

async function withUsageCounts(institutes: string[]) {
  const usageRows = await prisma.user.groupBy({
    by: ['institute'],
    where: {
      institute: {
        not: null,
      },
    },
    _count: {
      _all: true,
    },
  })

  const usageMap = new Map<string, number>()
  for (const row of usageRows) {
    if (!row.institute) continue
    const key = getInstituteKey(row.institute)
    usageMap.set(key, (usageMap.get(key) || 0) + (row._count?._all || 0))
  }

  return institutes
    .map((name) => ({
      name,
      usageCount: usageMap.get(getInstituteKey(name)) || 0,
    }))
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount
      return a.name.localeCompare(b.name)
    })
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.systemSettings.findFirst()
    const { institutes } = getRegistrationInstitutesState(settings?.testSettings)
    const rows = await withUsageCounts(institutes)

    return NextResponse.json({ institutes: rows })
  } catch {
    return NextResponse.json({ error: 'Failed to load institutes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = normalizeInstituteName(body?.name)
    if (!name) {
      return NextResponse.json({ error: 'Institute name is required' }, { status: 400 })
    }

    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: {} })
    }

    const { settings: currentTestSettings, institutes } = getRegistrationInstitutesState(settings.testSettings)
    const exists = institutes.some((item) => getInstituteKey(item) === getInstituteKey(name))
    if (exists) {
      return NextResponse.json({ error: 'Institute already exists' }, { status: 409 })
    }

    const nextInstitutes = [...institutes, name]
    const nextSettings = {
      ...currentTestSettings,
      registrationInstitutes: nextInstitutes,
    }

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        testSettings: nextSettings,
        toggledBy: currentUser.userId,
      },
    })

    const rows = await withUsageCounts(nextInstitutes)
    return NextResponse.json({ success: true, institutes: rows }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add institute' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await requireAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const previousName = normalizeInstituteName(body?.previousName)
    const name = normalizeInstituteName(body?.name)
    if (!previousName || !name) {
      return NextResponse.json({ error: 'Previous and new institute names are required' }, { status: 400 })
    }

    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: {} })
    }

    const { settings: currentTestSettings, institutes } = getRegistrationInstitutesState(settings.testSettings)
    const targetIndex = institutes.findIndex(
      (item) => getInstituteKey(item) === getInstituteKey(previousName)
    )
    if (targetIndex < 0) {
      return NextResponse.json({ error: 'Institute not found' }, { status: 404 })
    }

    const duplicate = institutes.some(
      (item, index) => index !== targetIndex && getInstituteKey(item) === getInstituteKey(name)
    )
    if (duplicate) {
      return NextResponse.json({ error: 'Another institute already has this name' }, { status: 409 })
    }

    const nextInstitutes = institutes.map((item, index) => (index === targetIndex ? name : item))
    const nextSettings = {
      ...currentTestSettings,
      registrationInstitutes: nextInstitutes,
    }

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        testSettings: nextSettings,
        toggledBy: currentUser.userId,
      },
    })

    const rows = await withUsageCounts(nextInstitutes)
    return NextResponse.json({ success: true, institutes: rows })
  } catch {
    return NextResponse.json({ error: 'Failed to update institute' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const name = normalizeInstituteName(searchParams.get('name'))
    if (!name) {
      return NextResponse.json({ error: 'Institute name is required' }, { status: 400 })
    }

    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: {} })
    }

    const { settings: currentTestSettings, institutes } = getRegistrationInstitutesState(settings.testSettings)
    const nextInstitutes = institutes.filter((item) => getInstituteKey(item) !== getInstituteKey(name))
    if (nextInstitutes.length === institutes.length) {
      return NextResponse.json({ error: 'Institute not found' }, { status: 404 })
    }

    const nextSettings = {
      ...currentTestSettings,
      registrationInstitutes: nextInstitutes,
    }

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        testSettings: nextSettings,
        toggledBy: currentUser.userId,
      },
    })

    const rows = await withUsageCounts(nextInstitutes)
    return NextResponse.json({ success: true, institutes: rows })
  } catch {
    return NextResponse.json({ error: 'Failed to delete institute' }, { status: 500 })
  }
}
