export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decoded = getCurrentUser(request)

    if (!decoded || decoded.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    if (!decoded || decoded.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
