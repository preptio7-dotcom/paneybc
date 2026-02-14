export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const tokenUser = getCurrentUser(request as any)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = tokenUser.userId

    await prisma.$transaction([
      prisma.note.deleteMany({ where: { userId } }),
      prisma.flashcard.deleteMany({ where: { userId } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Reset notes error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
