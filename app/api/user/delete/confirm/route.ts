export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const tokenUser = getCurrentUser(request as any)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { confirmToken } = await request.json()
    if (!confirmToken) {
      return NextResponse.json({ error: 'Confirmation token is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { id: true, email: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const otp = await prisma.otp.findFirst({
      where: { email: user.email, code: confirmToken, purpose: 'account_delete_confirm' },
    })
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Confirmation expired' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.otp.deleteMany({ where: { email: user.email, purpose: { in: ['account_delete', 'account_delete_confirm'] } } }),
      prisma.testResult.deleteMany({ where: { userId: user.id } }),
      prisma.reviewSchedule.deleteMany({ where: { userId: user.id } }),
      prisma.reviewNotificationLog.deleteMany({ where: { userId: user.id } }),
      prisma.studySession.deleteMany({ where: { userId: user.id } }),
      prisma.analytics.deleteMany({ where: { userId: user.id } }),
      prisma.note.deleteMany({ where: { userId: user.id } }),
      prisma.flashcard.deleteMany({ where: { userId: user.id } }),
      prisma.questionReport.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ])

    const response = NextResponse.json({ ok: true })
    response.cookies.set('token', '', { httpOnly: true, maxAge: 0, path: '/' })
    return response
  } catch (error: any) {
    console.error('Account delete confirm error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
