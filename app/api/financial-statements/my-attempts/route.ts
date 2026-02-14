export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserAttempts } from '@/lib/db/financial-statements'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const attempts = await getUserAttempts(user.userId)
    return NextResponse.json({ attempts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load attempts' }, { status: 500 })
  }
}
