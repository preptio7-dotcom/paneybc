import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const categories = await prisma.communityCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Community categories error:', error)
    return NextResponse.json(
      { error: 'Community categories are unavailable. Apply the community database migration.' },
      { status: 503 }
    )
  }
}