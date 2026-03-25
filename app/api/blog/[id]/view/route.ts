export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Post id is required' }, { status: 400 })
    }

    await prisma.blogPost.update({
      where: { id },
      data: {
        viewsCount: { increment: 1 },
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 200 })
  }
}

