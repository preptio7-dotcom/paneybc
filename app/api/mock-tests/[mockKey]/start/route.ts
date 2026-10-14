export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMockDefinitionByRouteKey } from '@/lib/mock-tests'
import { startMockSession } from '@/lib/mock-test-engine'

type StartPayload = {
  totalQuestions?: number
}

export async function POST(
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
      return NextResponse.json({ error: 'Unknown mock test mode' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as StartPayload
    const started = await startMockSession(
      prisma,
      currentUser.userId,
      definition,
      Number(body.totalQuestions) || definition.defaultQuestions
    )

    return NextResponse.json({
      success: true,
      ...started,
      testType: definition.testType,
    })
  } catch (error: any) {
    console.error('mock start error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

