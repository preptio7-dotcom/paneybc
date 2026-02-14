export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const request = req as any
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const submissions = await prisma.joinUsRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ submissions })
  } catch (error: any) {
    console.error('Join Us admin fetch error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

