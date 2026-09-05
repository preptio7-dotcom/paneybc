export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/admin-permissions'

export async function GET(request: NextRequest) {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json(paymentMethods)
  } catch (error: any) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!type || !displayName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get SystemSettings
    let systemSettings = await prisma.systemSettings.findFirst()
    if (!systemSettings) {
      systemSettings = await prisma.systemSettings.create({ data: {} })
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        type,
        displayName,
        accountTitle: accountTitle || null,
        accountNumberOrId: accountNumberOrId || null,
        additionalInfo: additionalInfo || null,
        isActive: isActive ?? true,
        displayOrder: displayOrder ?? 0,
        systemSettingsId: systemSettings.id,
      },
    })

    return NextResponse.json(paymentMethod)
  } catch (error: any) {
    console.error('Error creating payment method:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment method' },
      { status: 500 }
    )
  }
}
