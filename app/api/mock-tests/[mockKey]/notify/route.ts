export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMockDefinitionByRouteKey } from '@/lib/mock-tests'

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

    await prisma.mockTestNotifyRequest.upsert({
      where: {
        userId_testType: {
          userId: currentUser.userId,
          testType: definition.testType,
        },
      },
      create: {
        userId: currentUser.userId,
        testType: definition.testType,
      },
      update: {},
    })

    return NextResponse.json({
      success: true,
      message: `We'll notify you when ${definition.testName} is ready.`,
    })
  } catch (error: any) {
    console.error('mock notify error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

