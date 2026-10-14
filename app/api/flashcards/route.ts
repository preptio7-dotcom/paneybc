export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cards = await prisma.flashcard.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ cards })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { front, back, subject, chapter } = await request.json()
    if (!front || !back) {
      return NextResponse.json({ error: 'Front and back are required' }, { status: 400 })
    }

    const card = await prisma.flashcard.create({
      data: {
        userId: user.userId,
        front,
        back,
        subject,
        chapter,
      },
    })

    return NextResponse.json({ card }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.flashcard.deleteMany({ where: { id, userId: user.userId } })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, front, back, subject, chapter } = await request.json()
    if (!id || !front || !back) {
      return NextResponse.json({ error: 'ID, front and back are required' }, { status: 400 })
    }

    const card = await prisma.flashcard.updateMany({
      where: { id, userId: user.userId },
      data: { front, back, subject, chapter },
    })

    return NextResponse.json({ card })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

