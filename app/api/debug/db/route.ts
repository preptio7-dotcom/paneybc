export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    const dbName = process.env.DATABASE_URL ? 'neon' : 'unknown'
    return NextResponse.json({
      dbName,
      connected: true,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

