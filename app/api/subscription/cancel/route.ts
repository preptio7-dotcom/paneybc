export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { SubscriptionRequestStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const decoded = getCurrentUser(request)

    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user's approved subscription
    const subscription = await prisma.subscriptionRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: 'approved',
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Mark as cancelled
    await prisma.subscriptionRequest.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionRequestStatus.cancelled,
      },
    })

    // Clear user's ads-free status
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { adsFreeUntil: null },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully. You can resubscribe anytime.',
    })
  } catch (error: any) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
