export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMockDefinitionByRouteKey } from '@/lib/mock-tests'
import { getMockConfig } from '@/lib/mock-test-engine'
import { withCache } from '@/lib/cache'

// ─── Cache TTL ────────────────────────────────────────────────────────────────
// Config only changes when questions are added/removed — rare
// 15 minutes is safe — stale count of ±few questions doesn't break anything
const TTL_MOCK_CONFIG = 900  // 15 minutes

const KEY_MOCK_CONFIG = (mockKey: string) => `mock:config:${mockKey}`

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mockKey: string }> }
) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mockKey } = await params

    const definition = getMockDefinitionByRouteKey(mockKey)
    if (!definition) {
      return NextResponse.json(
        { error: 'Unknown mock test mode' },
        { status: 404 }
      )
    }

    // FIX: getMockConfig runs prisma.question.count() per subject + 
    // prisma.financialStatementCase.count() on every page load before
    // a mock test — same result for all users for the same mockKey
    // Now cached 15 min per mockKey — one DB hit per 15 min total
    const config = await withCache(
      KEY_MOCK_CONFIG(mockKey),
      TTL_MOCK_CONFIG,
      () => getMockConfig(prisma, definition)
    )

    return NextResponse.json(config)
  } catch (error: any) {
    console.error('mock config error:', error)
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}