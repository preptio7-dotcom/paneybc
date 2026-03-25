export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deleteCase, getCaseById, updateCase } from '@/lib/db/financial-statements'

const isAdmin = (request: NextRequest) => {
  const decoded = getCurrentUser(request)
  return Boolean(decoded && (decoded.role === 'admin' || decoded.role === 'super_admin'))
}

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } | Promise<{ caseId: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const resolvedParams = await params
    const caseId = Number(resolvedParams.caseId)
    const caseData = await getCaseById(caseId)
    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    return NextResponse.json({ case: caseData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load case' }, { status: 500 })
  }
}

export async function PUT(
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
    await updateCase(caseId, data)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update case' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseId: string } | Promise<{ caseId: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const resolvedParams = await params
    const caseId = Number(resolvedParams.caseId)
    await deleteCase(caseId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete case' }, { status: 400 })
  }
}
