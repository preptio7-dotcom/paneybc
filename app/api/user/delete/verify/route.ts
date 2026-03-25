export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const generateToken = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < 32; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export async function POST(request: Request) {
  try {
    const tokenUser = getCurrentUser(request as any)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { email: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const otp = await prisma.otp.findFirst({
      where: { email: user.email, code, purpose: 'account_delete' },
    })
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    await prisma.otp.deleteMany({ where: { email: user.email, purpose: 'account_delete' } })

    const confirmToken = generateToken()
    await prisma.otp.create({
      data: {
        email: user.email,
        code: confirmToken,
        purpose: 'account_delete_confirm',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    return NextResponse.json({ confirmToken })
  } catch (error: any) {
    console.error('Account delete verify error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
