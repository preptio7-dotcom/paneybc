export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createAdminAuditLog } from '@/lib/admin-audit'

type AdsDisabledRequest = {
  userId: string
  adsFreeUntil: string | null  // ISO string or null (never)
}

export async function PATCH(request: NextRequest) {
  try {
    const decoded = getCurrentUser(request)

    if (!decoded || decoded.role === 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, adsFreeUntil } = body as AdsDisabledRequest

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse the date
    let parsedDate: Date | null = null
    if (adsFreeUntil) {
      parsedDate = new Date(adsFreeUntil)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { adsFreeUntil: parsedDate } as any,
    })

    // Log audit
    await createAdminAuditLog({
      actor: decoded,
      action: 'user_ads_disabled',
      targetType: 'User',
      targetId: userId,
      metadata: {
        adsFreeUntil: parsedDate ? parsedDate.toISOString() : 'never',
      },
    })

    return NextResponse.json({
      success: true,
      message: parsedDate ? `User ad-free until ${parsedDate.toISOString()}` : 'User set to never have ads disabled',
      user: {
        id: updated.id,
        name: updated.name,
        adsFreeUntil: updated.adsFreeUntil,
      },
    })
  } catch (error: any) {
    console.error('Error updating user ad-free status:', error)
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 })
  }
}
