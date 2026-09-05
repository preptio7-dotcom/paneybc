import { requireAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const status = request.nextUrl.searchParams.get('status') || 'open'
    const reports = await prisma.communityReport.findMany({
      where: { status: status === 'all' ? undefined : status as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Community report queue error:', error)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const id = String(body?.id || '').trim()
    const status = ['open', 'reviewed', 'resolved'].includes(body?.status) ? body.status : null
    if (!id || !status) return NextResponse.json({ error: 'Report ID and valid status are required' }, { status: 400 })
    const report = await prisma.communityReport.update({ where: { id }, data: { status } })
    return NextResponse.json({ report })
  } catch (error) {
    console.error('Community report update error:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
