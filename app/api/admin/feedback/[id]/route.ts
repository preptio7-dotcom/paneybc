export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function isAdmin(request: NextRequest) {
  const user = getCurrentUser(request)
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin'))
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const nextStatus = String(body?.status || '').toLowerCase()

    if (nextStatus !== 'pending' && nextStatus !== 'approved') {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const feedback = await prisma.userFeedback.update({
      where: { id },
      data: {
        status: nextStatus,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error: any) {
    console.error('Admin feedback status update error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update feedback' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await context.params
    await prisma.userFeedback.delete({
      where: { id },
      select: { id: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin feedback delete error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete feedback' }, { status: 500 })
  }
}
