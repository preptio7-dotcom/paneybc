export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/admin-permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decoded = getCurrentUser(request)

    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch fresh user from DB to check current permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, adminPermissions: true }
    })

    if (!user || !hasPermission(user.role, user.adminPermissions, 'canManagePayments')) {
      return NextResponse.json({ error: 'Forbidden: No Payment access' }, { status: 403 })
    }

    const body = await request.json()
    const {
      type,
      displayName,
      accountTitle,
      accountNumberOrId,
      additionalInfo,
      isActive,
      displayOrder,
    } = body

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: {
        type,
        displayName,
        accountTitle: accountTitle || null,
        accountNumberOrId: accountNumberOrId || null,
        additionalInfo: additionalInfo || null,
        isActive,
        displayOrder,
      },
    })

    return NextResponse.json(paymentMethod)
  } catch (error: any) {
    console.error('Error updating payment method:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update payment method' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decoded = getCurrentUser(request)

    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch fresh user from DB to check current permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, adminPermissions: true }
    })

    if (!user || !hasPermission(user.role, user.adminPermissions, 'canManagePayments')) {
      return NextResponse.json({ error: 'Forbidden: No Payment access' }, { status: 403 })
    }

    await prisma.paymentMethod.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Payment method deleted' })
  } catch (error: any) {
    console.error('Error deleting payment method:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment method' },
      { status: 500 }
    )
  }
}
