export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const resolvedParams = await params
    const id = resolvedParams.id
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const updated = await prisma.financialStatementReport.update({
      where: { id },
      data: {
        status: 'resolved',
      },
    })

    return NextResponse.json({ success: true, report: updated })
  } catch (error: any) {
    console.error('Admin FS report resolve error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
