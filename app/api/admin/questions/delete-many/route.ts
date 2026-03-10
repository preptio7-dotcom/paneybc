export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { invalidateCache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No question ids provided' },
        { status: 400 }
      )
    }

    await prisma.question.deleteMany({ where: { id: { in: ids } } })

    // ── Cache invalidation ──────────────────────────────────────────────────
    // Multiple specific questions deleted — clear all question-related caches
    invalidateCache('questions:pool:')           // chapter pools now stale
    invalidateCache('questions:page:')           // paginated results now stale
    invalidateCache('subjects:chapter-counts:')  // counts dropped
    invalidateCache('mock:config:')              // canStart counts changed

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error: any) {
    console.error('Delete many questions error:', error)
    return NextResponse.json(
      { error: 'Failed to delete questions' },
      { status: 500 }
    )
  }
}