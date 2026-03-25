export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const isAdmin = (request: NextRequest) => {
  const decoded = getCurrentUser(request)
  return Boolean(decoded && (decoded.role === 'admin' || decoded.role === 'super_admin'))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { caseId: string } | Promise<{ caseId: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const resolvedParams = await params
    const caseId = Number(resolvedParams.caseId)
    const data = await request.json()
    const isActive = Boolean(data?.isActive)
    const updated = await prisma.financialStatementCase.update({
      where: { id: caseId },
      data: { isActive },
    })
    return NextResponse.json({ success: true, case: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to toggle case' }, { status: 400 })
  }
}
