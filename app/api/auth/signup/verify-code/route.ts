export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const otp = await prisma.otp.findFirst({
      where: {
        email: normalizedEmail,
        code,
        purpose: 'signup',
        expiresAt: { gt: new Date() },
      },
    })
    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'signup' } })

    const verificationToken = jwt.sign(
      { email: normalizedEmail, purpose: 'signup' },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    return NextResponse.json({ success: true, verificationToken })
  } catch (error: any) {
    console.error('[AUTH] Signup verify-code error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

