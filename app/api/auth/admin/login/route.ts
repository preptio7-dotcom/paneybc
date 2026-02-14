export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { sendAdminOTPEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, avatar: true, role: true, password: true, isBanned: true, adminOtpFailedAttempts: true },
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.adminOtpFailedAttempts && user.adminOtpFailedAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { adminOtpFailedAttempts: 0 },
      })
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
      console.error('[EMAIL] Admin OTP delivery failed:', emailError)
      return NextResponse.json({
        error: 'Credentials verified, but failed to send email. Check SMTP settings in .env',
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
