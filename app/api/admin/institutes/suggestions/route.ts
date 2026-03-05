export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { InstituteSuggestionStatus, Prisma } from '@prisma/client'
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

function isMissingSuggestionsTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code !== 'P2021') return false
  const table = String((error.meta as Record<string, unknown> | undefined)?.table || '')
  return table.includes('institute_suggestions')
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawStatus = String(searchParams.get('status') || 'all').toLowerCase()
    const query = String(searchParams.get('q') || '').trim().toLowerCase()

    const where: {
      status?: InstituteSuggestionStatus
      OR?: Array<{ suggestedName: { contains: string; mode: 'insensitive' } }>
    } = {}
    if (rawStatus === 'pending' || rawStatus === 'approved' || rawStatus === 'rejected') {
      where.status = rawStatus
    }
    if (query) {
      where.OR = [{ suggestedName: { contains: query, mode: 'insensitive' } }]
    }

    let rows: Array<unknown> = []
    try {
      rows = await prisma.instituteSuggestion.findMany({
        where,
        orderBy: [{ status: 'asc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      })
    } catch (error) {
      if (isMissingSuggestionsTableError(error)) {
        return NextResponse.json({
          rows: [],
          missingTable: true,
          message:
            'Institute suggestions storage is not initialized in this environment yet. Run migrations to enable the queue.',
        })
      }
      throw error
    }

    return NextResponse.json({ rows })
  } catch {
    return NextResponse.json({ error: 'Failed to load institute suggestions' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const id = String(body?.id || '').trim()
    const reviewNote = String(body?.reviewNote || '').trim().slice(0, 500)
    const statusRaw = String(body?.status || '').toLowerCase()

    if (!id) {
      return NextResponse.json({ error: 'Suggestion id is required' }, { status: 400 })
    }
    if (statusRaw !== 'approved' && statusRaw !== 'rejected' && statusRaw !== 'pending') {
      return NextResponse.json({ error: 'Invalid suggestion status' }, { status: 400 })
    }

    let suggestion = null
    try {
      suggestion = await prisma.instituteSuggestion.findUnique({ where: { id } })
    } catch (error) {
      if (isMissingSuggestionsTableError(error)) {
        return NextResponse.json(
          { error: 'Institute suggestions storage is not initialized in this environment.' },
          { status: 503 }
        )
      }
      throw error
    }
    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    if (statusRaw === 'approved') {
      let settings = await prisma.systemSettings.findFirst()
      if (!settings) {
        settings = await prisma.systemSettings.create({ data: {} })
      }
      const { settings: currentTestSettings, institutes } = getRegistrationInstitutesState(
        settings.testSettings
      )
      const exists = institutes.some(
        (item) => getInstituteKey(item) === getInstituteKey(suggestion.suggestedName)
      )
      if (!exists) {
        const nextSettings = {
          ...currentTestSettings,
          registrationInstitutes: [...institutes, normalizeInstituteName(suggestion.suggestedName)],
        }
        await prisma.systemSettings.update({
          where: { id: settings.id },
          data: {
            testSettings: nextSettings,
            toggledBy: currentUser.userId,
          },
        })
      }
    }

    const nextStatus = statusRaw as InstituteSuggestionStatus
    let updated
    try {
      updated = await prisma.instituteSuggestion.update({
        where: { id },
        data: {
          status: nextStatus,
          reviewNote: reviewNote || null,
          reviewedBy: currentUser.userId,
          reviewedAt: nextStatus === 'pending' ? null : new Date(),
        },
      })
    } catch (error) {
      if (isMissingSuggestionsTableError(error)) {
        return NextResponse.json(
          { error: 'Institute suggestions storage is not initialized in this environment.' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, suggestion: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update institute suggestion' }, { status: 500 })
  }
}
