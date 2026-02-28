export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

function sanitizeFeedbackMessage(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 2000)
}

function normalizeRating(value: unknown) {
  const rating = Number(value)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null
  return rating
}

function isFeedbackTableMissing(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021'
  )
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedback = await prisma.userFeedback.findUnique({
      where: { userId: currentUser.userId },
      select: {
        id: true,
        rating: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      hasSubmitted: Boolean(feedback),
      feedback: feedback || null,
    })
  } catch (error: any) {
    if (isFeedbackTableMissing(error)) {
      return NextResponse.json({
        hasSubmitted: false,
        feedback: null,
        setupRequired: true,
      })
    }
    return NextResponse.json({ error: error.message || 'Failed to load feedback' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const rating = normalizeRating(body.rating)
    const message = sanitizeFeedbackMessage(body.message)
    const source = String(body.source || '').trim().slice(0, 80) || null

    if (!rating || !message) {
      return NextResponse.json({ error: 'Rating and feedback message are required' }, { status: 400 })
    }

    const existing = await prisma.userFeedback.findUnique({
      where: { userId: currentUser.userId },
      select: { id: true, status: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Feedback already submitted. Please use update.' },
        { status: 409 }
      )
    }

    const feedback = await prisma.userFeedback.create({
      data: {
        userId: currentUser.userId,
        rating,
        message,
        source,
      },
      select: {
        id: true,
        rating: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error: any) {
    if (isFeedbackTableMissing(error)) {
      return NextResponse.json(
        { error: 'Feedback storage is not ready yet. Please contact support.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message || 'Failed to submit feedback' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const rating = normalizeRating(body.rating)
    const message = sanitizeFeedbackMessage(body.message)
    const source = String(body.source || '').trim().slice(0, 80) || null

    if (!rating || !message) {
      return NextResponse.json({ error: 'Rating and feedback message are required' }, { status: 400 })
    }

    const feedback = await prisma.userFeedback.update({
      where: { userId: currentUser.userId },
      data: {
        rating,
        message,
        source,
        status: 'pending',
      },
      select: {
        id: true,
        rating: true,
        message: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error: any) {
    if (isFeedbackTableMissing(error)) {
      return NextResponse.json(
        { error: 'Feedback storage is not ready yet. Please contact support.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message || 'Failed to update feedback' }, { status: 500 })
  }
}
