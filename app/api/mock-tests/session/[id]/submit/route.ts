export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { submitMockSession } from '@/lib/mock-test-engine'

type SubmitPayload = {
  answers?: unknown[]
  timeTakenSeconds?: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as SubmitPayload
    const submitted = await submitMockSession(prisma, currentUser.userId, id, body)

    return NextResponse.json({
      success: true,
      sessionId: id,
      alreadyCompleted: submitted.alreadyCompleted,
      summary: submitted.summary,
    })
  } catch (error: any) {
    const message = error?.message || 'Server error'
    if (message === 'Session not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('mock session submit error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

