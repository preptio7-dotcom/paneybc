import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: user.userId },
      data: { popupDismissed: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Dismiss welcome popup error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
