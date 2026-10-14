export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getAllCases } from '@/lib/db/financial-statements'

export async function GET() {
  try {
    const cases = await getAllCases(false)
    const formatted = cases.map((item) => ({
      ...item,
      questionCount: (item._count?.sociLineItems || 0) + (item._count?.sofpLineItems || 0),
    }))
    return NextResponse.json({ cases: formatted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load cases' }, { status: 500 })
  }
}
