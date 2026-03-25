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

    const notes = await prisma.note.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ notes })
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

    const { title, content, subject, chapter } = await request.json()
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const note = await prisma.note.create({
      data: {
        userId: user.userId,
        title,
        content,
        subject,
        chapter,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
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

    await prisma.note.deleteMany({ where: { id, userId: user.userId } })
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

    const { id, title, content, subject, chapter } = await request.json()
    if (!id || !title || !content) {
      return NextResponse.json({ error: 'ID, title and content are required' }, { status: 400 })
    }

    const note = await prisma.note.updateMany({
      where: { id, userId: user.userId },
      data: { title, content, subject, chapter },
    })

    return NextResponse.json({ note })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

