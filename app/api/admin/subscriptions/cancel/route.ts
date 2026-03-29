import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const decoded = verifyAuth(request)

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, subscriptionRequestId } = await request.json()

    if (!userId || !subscriptionRequestId) {
      return NextResponse.json(
        { error: 'Missing userId or subscriptionRequestId' },
        { status: 400 }
      )
    }

    // Find the subscription request
    const subscriptionRequest = await prisma.subscriptionRequest.findUnique({
      where: { id: subscriptionRequestId },
    })

    if (!subscriptionRequest) {
      return NextResponse.json(
        { error: 'Subscription request not found' },
        { status: 404 }
      )
    }

    if (subscriptionRequest.userId !== userId) {
      return NextResponse.json(
        { error: 'Subscription request does not belong to this user' },
        { status: 400 }
      )
    }

    // Update subscription request status to cancelled
    const updatedRequest = await prisma.subscriptionRequest.update({
      where: { id: subscriptionRequestId },
      data: {
        status: 'cancelled',
      },
    })

    // Remove ads-free expiration from user
    await prisma.user.update({
      where: { id: userId },
      data: {
        adsFreeUntil: null,
      },
    })

    console.log(`[Admin] Cancelled subscription for user ${userId} by admin ${decoded.userId}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Subscription cancelled successfully',
        subscriptionRequest: updatedRequest,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Subscription Cancel] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
