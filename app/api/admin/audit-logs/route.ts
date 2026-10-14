export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function requireAdmin(request: NextRequest) {
  const user = getCurrentUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null
  }
  return user
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get('limit') || 100)
    const limit = Math.min(Math.max(limitRaw, 1), 300)

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        actorId: true,
        actorEmail: true,
        actorRole: true,
        action: true,
        targetType: true,
        targetId: true,
        before: true,
        after: true,
        metadata: true,
        ip: true,
        userAgent: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error('Admin audit logs error:', error)
    return NextResponse.json({ error: 'Failed to load audit logs' }, { status: 500 })
  }
}

