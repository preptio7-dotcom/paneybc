export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendJoinUsReplyEmail } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getCurrentUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = params
    const { message, status } = await req.json()
    if (!id || !message) {
      return NextResponse.json({ error: 'Submission ID and message are required' }, { status: 400 })
    }

    const submission = await prisma.joinUsRequest.findUnique({ where: { id } })
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const updated = await prisma.joinUsRequest.update({
      where: { id },
      data: {
        adminReply: message,
        repliedAt: new Date(),
        status: status || 'replied',
      },
    })

    try {
      await sendJoinUsReplyEmail(updated.email, updated.name, updated.type, message)
    } catch (emailError) {
      console.error('[EMAIL] Join Us reply failed:', emailError)
    }

    return NextResponse.json({ success: true, submission: updated })
  } catch (error: any) {
    console.error('Join Us admin reply error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getCurrentUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 })
    }

    await prisma.joinUsRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Join Us admin delete error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

