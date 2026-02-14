export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCaseById } from '@/lib/db/financial-statements'

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } | Promise<{ caseId: string }> }
) {
  try {
    const resolvedParams = await params
    const caseId = Number(resolvedParams.caseId)
    const caseData = await getCaseById(caseId)
    if (!caseData || !caseData.isActive) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }
    return NextResponse.json({ case: caseData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load case' }, { status: 500 })
  }
}
