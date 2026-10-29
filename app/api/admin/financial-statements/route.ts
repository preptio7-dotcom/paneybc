export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { createCase, getAllCases } from '@/lib/db/financial-statements'

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const cases = await getAllCases(true)
    return NextResponse.json({ cases })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load cases' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const data = await request.json()
    const caseId = await createCase(data)
    return NextResponse.json({ success: true, caseId }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create case' }, { status: 400 })
  }
}
