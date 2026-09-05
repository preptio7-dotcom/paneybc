export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { startAttempt } from '@/lib/db/financial-statements'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, timeLimit } = await request.json()
    if (!caseId || !timeLimit) {
      return NextResponse.json({ error: 'Case ID and time limit are required' }, { status: 400 })
    }

    const attemptId = await startAttempt(user.userId, Number(caseId), Number(timeLimit))
    return NextResponse.json({ attemptId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start attempt' }, { status: 500 })
  }
}
