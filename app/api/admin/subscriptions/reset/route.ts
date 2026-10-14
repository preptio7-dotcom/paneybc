export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * Admin endpoint to reset a user's subscription for testing/debugging
 * POST /api/admin/subscriptions/reset?userId=XXX
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getCurrentUser(request)

    // Only super_admin can use this
    if (!decoded || decoded.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized - super_admin only' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    // Clear user's subscription
    const user = await prisma.user.update({
      where: { id: userId },
      data: { adsFreeUntil: null },
    })

    // Delete all subscription requests for this user
    const deleted = await prisma.subscriptionRequest.deleteMany({
      where: { userId },
    })

    console.log(`[Admin] Reset subscription for user ${userId}:`, {
      userUpdate: user.id,
      requestsDeleted: deleted.count,
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.count} subscription requests and cleared adsFreeUntil for user ${userId}`,
      deletedRequests: deleted.count,
      user: {
        id: user.id,
        email: user.email,
        adsFreeUntil: user.adsFreeUntil,
      },
    })
  } catch (error: any) {
    console.error('Error resetting subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset subscription' },
      { status: 500 }
    )
  }
}
