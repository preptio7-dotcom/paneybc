export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAttemptById, getCaseById } from '@/lib/db/financial-statements'

export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } | Promise<{ attemptId: string }> }
) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const resolvedParams = await params
    const attemptId = Number(resolvedParams.attemptId)
    const attempt = await getAttemptById(attemptId)
    if (!attempt || attempt.userId !== user.userId) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    const caseData = await getCaseById(attempt.caseId)
    return NextResponse.json({ attempt, caseData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load results' }, { status: 500 })
  }
}
