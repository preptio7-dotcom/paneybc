export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const decoded = getCurrentUser(request)

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const plan = formData.get('plan') as string
    const paymentMethodId = formData.get('paymentMethodId') as string
    const paymentProofFile = formData.get('paymentProofFile') as File
    const paymentDetails = formData.get('paymentDetails') as string

    // Validation
    if (!plan || !['one_month', 'lifetime'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    }

    if (!paymentProofFile) {
      return NextResponse.json({ error: 'Payment proof is required' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (paymentProofFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Verify payment method exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    })

    if (!paymentMethod || !paymentMethod.isActive) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.subscriptionRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: 'pending',
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending subscription request. Please wait for admin approval.' },
        { status: 400 }
      )
    }

    // Read file as buffer
    const bytes = await paymentProofFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Convert to base64 for storage
    const fileBase64 = buffer.toString('base64')
    const fileExtension = paymentProofFile.name.split('.').pop() || 'bin'
    const fileName = paymentProofFile.name
    
    // Generate unique proof ID
    const proofId = crypto.randomBytes(16).toString('hex')
    const proofUrl = `/api/subscription/payment-proof/${proofId}`

    // Create subscription request with file data
    const subscriptionRequest = await (prisma.subscriptionRequest.create as any)({
      data: {
        userId: decoded.userId,
        plan: plan as 'one_month' | 'lifetime',
        paymentProofUrl: proofUrl,
        paymentMethod: paymentMethod.displayName,
        status: 'pending',
        // Store file metadata for later retrieval
        additionalInfo: {
          proofId,
          fileName,
          fileExtension,
          fileSize: paymentProofFile.size,
          fileBase64,
          uploadedAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription request submitted successfully',
      requestId: subscriptionRequest.id,
    })
  } catch (error: any) {
    console.error('Error creating subscription request:', error)
    
    // Return generic error message to user (don't expose internal paths)
    return NextResponse.json(
      { error: 'Failed to submit subscription request. Please try again later.' },
      { status: 500 }
    )
  }
}
