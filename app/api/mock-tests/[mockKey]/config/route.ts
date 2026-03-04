export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMockDefinitionByRouteKey } from '@/lib/mock-tests'
import { getMockConfig } from '@/lib/mock-test-engine'

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
      return NextResponse.json({ error: 'Unknown mock test mode' }, { status: 404 })
    }

    const config = await getMockConfig(prisma, definition)
    return NextResponse.json(config)
  } catch (error: any) {
    console.error('mock config error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

