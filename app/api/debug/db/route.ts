export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    if (!requireAdminUser(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.$queryRaw`SELECT 1`
    const dbName = process.env.DATABASE_URL ? 'neon' : 'unknown'
    return NextResponse.json({
      dbName,
      connected: true,
    })
  } catch (error) {
    console.error('Database diagnostic error:', error)
    return NextResponse.json({ error: 'Database diagnostic failed' }, { status: 500 })
  }
}

