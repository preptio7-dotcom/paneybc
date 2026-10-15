export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processEmailSchedules } from '@/lib/email-campaigns'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const scheduleId = typeof body.scheduleId === 'string' ? body.scheduleId : undefined
    const sendNow = Boolean(body.sendNow || scheduleId)

    const result = await processEmailSchedules({ scheduleId, sendNow })

    if (scheduleId && result.processed === 0) {
      return NextResponse.json({ error: result.message || 'Schedule not found or already sent', ...result }, { status: 404 })
    }

    if (result.sent === 0 && result.failed > 0) {
      return NextResponse.json(
        { error: 'Campaign did not deliver to any recipients. Check SMTP settings and last error.', ...result },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
