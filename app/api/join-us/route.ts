export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendJoinUsAdminEmail, sendJoinUsThankYouEmail } from '@/lib/email'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const currentUser = getCurrentUser(req)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const { type, name, email } = body
    if (!type || !name || !email) {
      return NextResponse.json({ error: 'Type, name, and email are required' }, { status: 400 })
    }

    await prisma.joinUsRequest.create({ data: body })

    try {
      await sendJoinUsThankYouEmail(body.email, body.name, body.type)
      await sendJoinUsAdminEmail(body)
    } catch (emailError) {
      console.error('Join Us email error:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Join Us submit error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

