export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/admin-permissions'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { sendSubscriptionApprovedEmail, sendSubscriptionRejectedEmail } from '@/lib/email-service'

export async function GET(request: NextRequest) {
  try {
    const decoded = getCurrentUser(request)

    if (!decoded || decoded.role === 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = (searchParams.get('status') || 'pending') as 'pending' | 'approved' | 'rejected' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.subscriptionRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              cenNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriptionRequest.count({ where }),
    ])

    return NextResponse.json({
      requests,
      total,
      pages: Math.ceil(total / limit),
      page,
    })
  } catch (error: any) {
    console.error('Error fetching subscription requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
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
    const { requestId, action, rejectionReason } = body

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Fetch the request
    const subscriptionRequest = await prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    })

    if (!subscriptionRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (subscriptionRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only process pending requests' },
        { status: 400 }
      )
    }

    let adsFreeUntil: Date | null = null
    if (action === 'approve') {
      // Calculate ads-free until date based on plan
      const now = new Date()
      if (subscriptionRequest.plan === 'one_month') {
        adsFreeUntil = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      } else {
        // lifetime - set to a very far date (2099)
        adsFreeUntil = new Date(2099, 11, 31)
      }
    }

    // Update subscription request
    const updated = await prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        rejectionReason: action === 'reject' ? rejectionReason : null,
        approvedBy: decoded.userId,
        approvedAt: new Date(),
        adsFreeUntil,
      },
    })

    // If approved, update user's adsFreeUntil field
    if (action === 'approve' && adsFreeUntil) {
      await prisma.user.update({
        where: { id: subscriptionRequest.userId },
        data: { adsFreeUntil } as any,
      })

      // Send approval email notification
      const emailResult = await sendSubscriptionApprovedEmail(
        subscriptionRequest.user.email,
        subscriptionRequest.user.name,
        subscriptionRequest.plan
      )
      
      if (!emailResult.success) {
        console.error('Email notification failed:', emailResult.error)
      } else {
        console.log('Approval email sent to:', subscriptionRequest.user.email)
      }

      // Send push notification to user
      try {
        // Get user's push subscriptions from database if available
        // For now, we'll mark this as approved so the user sees it on next load
        console.log('Subscription approved for user:', subscriptionRequest.userId)
      } catch (pushError) {
        console.error('Push notification error:', pushError)
      }
    } else if (action === 'reject') {
      // Send rejection email notification
      const emailResult = await sendSubscriptionRejectedEmail(
        subscriptionRequest.user.email,
        subscriptionRequest.user.name,
        subscriptionRequest.plan,
        rejectionReason
      )
      
      if (!emailResult.success) {
        console.error('Rejection email failed:', emailResult.error)
      } else {
        console.log('Rejection email sent to:', subscriptionRequest.user.email)
      }
    }

    // Log audit
    await createAdminAuditLog({
      actor: decoded,
      action: 'subscription_review',
      targetType: 'SubscriptionRequest',
      targetId: requestId,
      metadata: {
        action,
        userId: subscriptionRequest.userId,
        plan: subscriptionRequest.plan,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Subscription request ${action}ed successfully`,
      updated,
    })
  } catch (error: any) {
    console.error('Error processing subscription request:', error)
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 })
  }
}
