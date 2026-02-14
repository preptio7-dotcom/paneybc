export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const isAdmin = (request: Request) => {
  const user = getCurrentUser(request as any)
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin'))
}

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const reports = await prisma.financialStatementReport.findMany({
      where: { status: { not: 'resolved' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ reports })
  } catch (error: any) {
    console.error('Admin FS reports fetch error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
