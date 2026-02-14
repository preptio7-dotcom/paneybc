export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAdminOTPEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, role: true, isBanned: true },
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'admin_login' } })
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        code,
        purpose: 'admin_login',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    try {
      await sendAdminOTPEmail(normalizedEmail, code)
    } catch (emailError: any) {
      console.error('[EMAIL] Admin OTP resend failed:', emailError)
      return NextResponse.json({
        error: 'Failed to send email. Check SMTP settings in .env',
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'OTP resent successfully' })
  } catch (error: any) {
    console.error('Admin OTP resend error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
