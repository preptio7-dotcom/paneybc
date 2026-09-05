export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { resolveAvatarsForUsers } from '@/lib/avatar-pack-service'

function isAdmin(request: NextRequest) {
  const user = getCurrentUser(request)
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin'))
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = String(searchParams.get('status') || 'all').toLowerCase()
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 200)

    const where =
      statusFilter === 'approved' || statusFilter === 'pending'
        ? { status: statusFilter }
        : {}

    const feedback = await prisma.userFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        rating: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            avatarId: true,
            city: true,
            level: true,
            email: true,
          },
        },
      },
    })

    const resolvedAvatars = await resolveAvatarsForUsers(feedback.map((item) => item.user || {}))
    const normalizedFeedback = feedback.map((item, index) => ({
      ...item,
      user: item.user
        ? {
            ...item.user,
            avatar: resolvedAvatars[index]?.avatar || '',
          }
        : item.user,
    }))

    return NextResponse.json({ feedback: normalizedFeedback })
  } catch (error: any) {
    console.error('Admin feedback fetch error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load feedback' }, { status: 500 })
  }
}
