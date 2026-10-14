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
    const type = (searchParams.get('type') || '').trim().toLowerCase()
    const status = (searchParams.get('status') || '').trim().toLowerCase()
    const query = (searchParams.get('q') || '').trim()

    const where: any = {}
    if (type) where.type = type
    if (status && ['new', 'reviewed', 'replied'].includes(status)) {
      where.status = status
    }
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { institute: { contains: query, mode: 'insensitive' } },
        { message: { contains: query, mode: 'insensitive' } },
      ]
    }

    const [submissions, totalCount, newAmbassadorCount] = await Promise.all([
      prisma.joinUsRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.joinUsRequest.count({ where }),
      prisma.joinUsRequest.count({
        where: {
          type: 'ambassador',
          status: 'new',
        },
      }),
    ])

    return NextResponse.json({
      submissions,
      totalCount,
      newAmbassadorCount,
    })
  } catch (error: any) {
    console.error('Join Us admin fetch error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

