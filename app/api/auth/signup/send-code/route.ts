export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSignupVerificationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'signup' } })
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        code,
        purpose: 'signup',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    try {
      await sendSignupVerificationEmail(normalizedEmail, code)
    } catch (emailError: any) {
      console.error('[EMAIL] Signup verification send failed:', emailError)
      return NextResponse.json({ error: 'Failed to send verification email. Check SMTP settings.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Verification code sent' })
  } catch (error: any) {
    console.error('[AUTH] Signup send-code error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

