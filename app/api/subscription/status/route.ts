export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const decoded = getCurrentUser(request)

    // If not authenticated, return not subscribed
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({
        success: true,
        isSubscribed: false,
        adsFreeUntil: null,
        expiresAt: null,
      })
    }

    // Fetch user with their subscription data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        adsFreeUntil: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        success: true,
        isSubscribed: false,
        adsFreeUntil: null,
        expiresAt: null,
      })
    }

    // Check if they have an active subscription
    const isSubscribed = user.adsFreeUntil && new Date(user.adsFreeUntil) > new Date()

    return NextResponse.json({
      success: true,
      isSubscribed,
      adsFreeUntil: user.adsFreeUntil,
      expiresAt: user.adsFreeUntil ? new Date(user.adsFreeUntil).toISOString() : null,
    })
  } catch (error: any) {
    console.error('Error refreshing subscription status:', error)
    // Return not subscribed on error instead of 500
    return NextResponse.json({
      success: true,
      isSubscribed: false,
      adsFreeUntil: null,
      expiresAt: null,
    })
  }
}
