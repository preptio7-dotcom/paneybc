export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
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

    // Verify payment method exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    })

    if (!paymentMethod || !paymentMethod.isActive) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    // Save uploaded file
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'payment-proofs')

    // Create directories if they don't exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const fileExtension = paymentProofFile.name.split('.').pop()
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}.${fileExtension}`
    const filePath = join(uploadsDir, uniqueFilename)
    const publicUrl = `/uploads/payment-proofs/${uniqueFilename}`

    // Write file to disk
    const bytes = await paymentProofFile.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Check if user already has a pending request
    const existingRequest = await prisma.subscriptionRequest.findFirst({
      where: {
        userId: decoded.id,
        status: 'pending',
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending subscription request. Please wait for admin approval.' },
        { status: 400 }
      )
    }

    // Create subscription request
    const subscriptionRequest = await prisma.subscriptionRequest.create({
      data: {
        userId: decoded.userId,
        plan: plan as 'one_month' | 'lifetime',
        paymentProofUrl: publicUrl,
        paymentMethod: paymentMethod.displayName,
        status: 'pending' as any,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription request submitted successfully',
      requestId: subscriptionRequest.id,
    })
  } catch (error: any) {
    console.error('Error creating subscription request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription request' },
      { status: 500 }
    )
  }
}
